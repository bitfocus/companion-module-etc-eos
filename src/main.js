const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const { GetVariableDefinitions, UpdateVariableDefinitions } = require('./variables')
const UpdatePresetDefinitions = require('./presets')
const { ParamMap } = require('./param_map')
const constants = require('./constants.js')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Disconnected)

		this.instanceState = {}
		this.debugToLogger = true

		this.lastActChan = -1
		this.eos_port = this.config.use_slip ? constants.EOS_PORT_SLIP : constants.EOS_PORT
		this.readingWheels = false


		// Wheel information as module only variables, not exposed
		this.wpc = constants.WHEELS_PER_CAT // 64
		this.wheelsPerCategory = constants.WHEELS_PER_CAT // 64
		this.wheels = []
		this.emptyWheelData() // clear out encoder wheel values

		// Cues of the configured cue list, keyed by their Eos index (0-based)
		this.cueListRecords = new Map()
		this.cueListDefinedNumbers = []

		// Group/preset/macro labels, read by index so only targets that exist in the show are polled
		this.labelLists = {}
		this.labelDefinedNumbers = {}
		for (const type of constants.LABEL_NAMES) {
			this.labelLists[type] = { records: [], pending: undefined, expected: 0 }
			this.labelDefinedNumbers[type] = []
		}

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets() // export presets

		this.oscSocket = this.getOsc10Socket(this.config.host, this.eos_port)
		this.setOscSocketListeners()
		this.startReconnectTimer()
		
		this.debugCallToSetVariableCnt = 0
	}

	// Empty wheel data
	emptyWheelData() {
		for (let i = 1; i <= 100; i++) {
			this.wheels[i] = {}
			this.wheels[i].label = ''
			this.wheels[i].stringval = ''
			this.wheels[i].cat = ''
			this.wheels[i].floatval = ''
		}
	}

	// When module gets deleted
	async destroy() {
		this.clearCueListTimers()
		this.clearLabelListTimers()

		// Clear the reconnect timer if it exists.
		if (this.reconnectTimer !== undefined) {
			clearInterval(this.reconnectTimer)
			delete this.reconnectTimer
		}

		// Close the socket.
		this.closeOscSocket()
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		let currentHost = this.config.host
		let currentUserId = this.config.user_id
		let currentUseSlip = this.config.use_slip
		let currentNumLabels = this.getNumLabelsToPoll()
		let currentCueList = this.getCueListToPoll()
		let currentNumCues = this.getNumCuesToPoll()

		this.config = config

		if (
			currentHost !== this.config.host ||
			currentUserId !== this.config.user_id ||
			currentUseSlip !== this.config.use_slip
		) {
			this.closeOscSocket()
			this.clearCueListTimers()
			this.clearLabelListTimers()
			this.eos_port = this.config.use_slip ? constants.EOS_PORT_SLIP : constants.EOS_PORT
			await this.init(config)
			return
		}

		if (currentNumLabels !== this.getNumLabelsToPoll() && this.instanceState['connected']) {
			this.requestLabelLists()
		}

		if (currentCueList !== this.getCueListToPoll() || currentNumCues !== this.getNumCuesToPoll()) {
			if (this.instanceState['connected']) {
				this.requestCueList()
			} else {
				this.clearCueList()
			}
		}
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'user_id',
				label: 'User ID',
				default: 1,
				width: 4,
				regex: '/^(-1|0|\\d+)$/',
			},
			/*
			{
				type: 'number',
				id: 'eos_port',
				label: 'EOS Port',
				default: 3032,
				min: 1,
				max: 65535,
				required: true,
			},
*/
			{
				type: 'checkbox',
				id: 'use_slip',
				label: 'Use TCP SLIP',
				default: false,
				required: true,
			},
			{
				type: 'number',
				id: 'num_labels',
				label: 'Labels to poll',
				default: constants.DEFAULT_NUM_LABELS,
				min: 1,
				max: 9999,
				required: true,
			},
			{
				type: 'number',
				id: 'cue_list',
				label: 'Cue list for cue variables (0 = off)',
				default: constants.DEFAULT_CUE_LIST,
				min: 0,
				max: 999,
				width: 6,
				required: true,
			},
			{
				type: 'number',
				id: 'num_cues',
				label: 'Cues to poll',
				default: constants.DEFAULT_NUM_CUES,
				min: 0,
				max: 9999,
				width: 6,
				required: true,
			},
		]
	}

	getCueListToPoll() {
		let configuredValue = Number(this.config?.cue_list)
		if (Number.isFinite(configuredValue) && configuredValue >= 0) {
			return Math.floor(configuredValue)
		}

		return constants.DEFAULT_CUE_LIST
	}

	getNumCuesToPoll() {
		let configuredValue = Number(this.config?.num_cues)
		if (Number.isFinite(configuredValue) && configuredValue >= 0) {
			return Math.floor(configuredValue)
		}

		return constants.DEFAULT_NUM_CUES
	}

	/**
	 * Cue lists can't be polled when the list or the number of cues is 0.
	 */
	isCueListPollingEnabled() {
		return this.getCueListToPoll() > 0 && this.getNumCuesToPoll() > 0
	}

	getNumLabelsToPoll() {
		let configuredValue = Number(this.config?.num_labels)
		if (Number.isFinite(configuredValue)) {
			configuredValue = Math.floor(configuredValue)
			if (configuredValue > 0) {
				return configuredValue
			}
		}

		return constants.DEFAULT_NUM_LABELS
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}

	updatePresets() {
		UpdatePresetDefinitions(this)
	}

	/**
	 * Sets the connection state of this module to the Eos console.
	 *
	 * @param isConnected
	 */
	setConnectionState(isConnected) {
		let currentState = this.instanceState['connected']

		this.updateStatus(isConnected ? InstanceStatus.Ok : InstanceStatus.Disconnected)
		this.setInstanceStates({ connected: isConnected })

		if (currentState !== isConnected) {
			// The connection state changed. Update the feedback.
			this.checkFeedbacks('connected')
		}
	}

	/**
	 * Closes the OSC socket.
	 */
	closeOscSocket() {
		if (this.oscSocket !== undefined) {
			this.oscSocket.close()

			if (this.oscSocket.socket !== undefined) {
				this.oscSocket.socket.destroy()
				delete this.oscSocket.socket
			}

			delete this.oscSocket
		}

		this.emptyState()
	}

	/**
	 * Watches for disconnects and reconnects to the console.
	 */
	startReconnectTimer() {
		if (this.reconnectTimer !== undefined) {
			// Timer is already running.
			return
		}

		this.reconnectTimer = setInterval(() => {
			if (!this.oscSocket || !this.oscSocket.socket) {
				// Socket not valid
				return
			}

			if (this.oscSocket.socket.readyState === 'open') {
				// Already connected. Nothing to do.
				return
			}

			// Re-open the TCP socket
			this.oscSocket.socket.connect(this.eos_port, this.config.host)
		}, 5000)
	}

	/**
	 * Updates the internal state of a variable within this module.
	 *
	 * Optionally updates the dynamic variable with its new value.
	 */
	setInstanceStates(values, isVariable) {
		for (const [key, value] of Object.entries(values)) {
			this.instanceState[key] = value
		}

		if (isVariable) {
			this.debugCallToSetVariableCnt++
			this.setVariableValues(values)
		}
	}

	/**
	 * Returns the monkey-patched OSC connection to the console.
	 */
	getOsc10Socket(address, port) {
		let OSC10 = require('osc')

		let oscTcp = new OSC10.TCPSocketPort({
			address: address,
			port: port,
			useSLIP: this.config.use_slip,
			metadata: true,
		})

		// Return the OSC 1.0 TCP connection.
		return oscTcp
	}

	/**
	 * Sets the listeners on the this.oscSocket object.
	 *
	 * Only needs to be done once, even if the socket reconnects.
	 */
	setOscSocketListeners() {
		this.oscSocket.on('error', (err) => {
			if (this.instanceState['connected'] === true) {
				// Only show errors if we're connected, otherwise we'll flood the debug log each time
				//  the module tries to reconnect to the console.
				this.log('error', `Error: ${err.message}`)
			}
		})

		const cueActive = /^\/eos\/out\/active\/cue\/([\d\.]+)\/([\d\.]+)$/
		const cueActiveText = '/eos/out/active/cue/text'
		const cuePending = /^\/eos\/out\/pending\/cue\/([\d\.]+)\/([\d\.]+)$/
		const cuePendingText = '/eos/out/pending/cue/text'
		const cuePendingOut = '/eos/out/pending/cue'
		const cuePrevious = /^\/eos\/out\/previous\/cue\/([\d\.]+)\/([\d\.]+)$/
		const cuePreviousText = '/eos/out/previous/cue/text'
		const cuePreviousOut = '/eos/out/previous/cue'
		const showName = '/eos/out/show/name'
		const version = '/eos/out/get/version'
		const showLoaded = '/eos/out/event/show/loaded'
		const showCleared = '/eos/out/event/show/cleared'
		const softkey = /^\/eos\/out\/softkey\/(\d+)$/
		const cmd = /^\/eos\/out\/user\/(\d+)\/cmd$/
		const chan = '/eos/out/active/chan'
		const colorhs = '/eos/out/color/hs'
		const labels = /^\/eos\/out\/get\/(group|preset|macro)\/([\d\.]+)\/list\/([\d\.]+)\/([\d\.]+)$/
		const labelsCount = /^\/eos\/out\/get\/(group|preset|macro)\/count$/
		const labelsUpdated = /^\/eos\/out\/notify\/(group|preset|macro)\/list\/([\d\.]+)\/([\d\.]+)$/
		const macro = /^\/eos\/out\/event\/macro\/(\d+)$/
		const cueListCount = /^\/eos\/out\/get\/cue\/(\d+)\/count$/
		const cueListRecord = /^\/eos\/out\/get\/cue\/(\d+)\/([\d\.]+)\/(\d+)\/list\/(\d+)\/(\d+)$/
		const cueListUpdated = /^\/eos\/out\/notify\/cue\/(\d+)\/list\/(\d+)\/(\d+)$/

		// Maybe for later
		// const groupChannels = /^\/eos\/out\/get\/group\/([\d\.]+)\/channels\/list\/([\d\.]+)/([\d\.]+)$/

		// This is the raw OSC message, but we are getting something parsed already...
		// const enc_wheel      = /^\/eos\/out\/active\/wheel\/(\d+),\s*(\w+)\s*\[(\w+)\]\(s\).\s+(\d+)\(i\),\s*([\d.]*)\(f\)$/
		const enc_wheel = /^\/eos\/out\/active\/wheel\/(\d+)/

		const handleMessage = (message) => {
			if (this.debugToLogger) {
				this.log('debug', `Eos OSC message: ${message.address}`)
				this.log('debug', `  Eos OSC message args: ${JSON.stringify(message.args)}`)
			}

			let matches

			if ((matches = message.address.match(cueActive))) {
				this.setInstanceStates(
					{
						cue_active_list: matches[1],
						cue_active_num: matches[2],
					},
					true
				)
				this.checkFeedbacks('active_cue')
			} else if (message.address === cueActiveText) {
				this.parseCueName('active', String(message.args?.[0]?.value ?? ''))
			} else if ((matches = message.address.match(cuePending))) {
				this.setInstanceStates(
					{
						cue_pending_list: matches[1],
						cue_pending_num: matches[2],
					},
					true
				)
				this.checkFeedbacks('pending_cue')
			} else if (message.address === cuePendingOut && message.args.length == 0) {
				this.setInstanceStates(
					{
						cue_pending_list: '',
						cue_pending_num: '',
					},
					true
				)
			} else if (message.address === cuePendingText) {
				this.parseCueName('pending', String(message.args?.[0]?.value ?? ''))
			} else if ((matches = message.address.match(cuePrevious))) {
				this.setInstanceStates(
					{
						cue_previous_list: matches[1],
						cue_previous_num: matches[2],
					},
					true
				)
				this.checkFeedbacks('previous_cue')
			} else if (message.address === cuePreviousOut && message.args.length == 0) {
				this.setInstanceStates(
					{
						cue_previous_list: '',
						cue_previous_num: '',
					},
					true
				)
			} else if (message.address === cuePreviousText) {
				this.parseCueName('previous', String(message.args?.[0]?.value ?? ''))
			} else if (message.address === showName && message.args.length === 1 && message.args[0].type === 's') {
				this.setInstanceStates(
					{
						show_name: message.args[0].value,
					},
					true
				)
			} else if (
				message.address === version &&
				message.args.length === 3 &&
				message.args[0].type === 's' &&
				message.args[1].type === 's' &&
				message.args[2].type === 'i'
			) {
				this.setInstanceStates(
					{
						eos_version: message.args[0].value,
						fixture_library_version: message.args[1].value,
						gel_swatch_type: message.args[2].value,
					},
					true
				)
			} else if (message.address === version && message.args.length === 1 && message.args[0].type === 's') {
				this.setInstanceStates(
					{
						eos_version: message.args[0].value,
						fixture_library_version: '',
						gel_swatch_type: '',
					},
					true
				)
			} else if (message.address === showLoaded || message.address === showCleared) {
				// Reset the state when a show is loaded or a new show is created.
				this.requestFullState()
				this.requestCueList()
				this.requestLabelLists()
			} else if ((matches = message.address.match(cueListCount))) {
				this.handleCueListCount(matches[1], message.args?.[0]?.value)
			} else if ((matches = message.address.match(cueListRecord))) {
				// The address ends in list/<arg offset>/<arg count>, which is about splitting long replies, not
				// the cue's position. The cue's index in the list is the first argument; its label the third.
				this.handleCueListRecord(matches[1], matches[2], matches[3], message.args?.[0]?.value, message.args?.[2]?.value)
			} else if ((matches = message.address.match(cueListUpdated))) {
				if (Number(matches[1]) === this.getCueListToPoll()) {
					// A cue in our list was added, changed or deleted. Indexes may have shifted, so re-read the list.
					this.scheduleCueListRefresh()
				}
			} else if (
				(matches = message.address.match(softkey)) &&
				message.args.length === 1 &&
				message.args[0].type === 's'
			) {
				this.setInstanceStates(
					{
						[`softkey_label_${matches[1]}`]: message.args[0].value,
					},
					true
				)
			} else if ((matches = message.address.match(cmd))) {
				let userid = matches[1]
				if (userid == this.config.user_id || this.config.user_id == '-1') {
					this.setInstanceStates(
						{
							cmd: message.args?.[0]?.value ?? '',
						},
						true
					)
				}
			} else if ((matches = message.address.match(macro))) {
				const macroId = matches[1]
				this.setInstanceStates(
					{
						macro_fired: macroId,
						last_macro: macroId,
					},
					true
				)
				this.checkFeedbacks('macroisfired')
				setTimeout(() => {
					this.setInstanceStates(
						{
							macro_fired: '0',
						},
						true
					)
					this.checkFeedbacks('macroisfired')
				}, 100)
			} else if ((matches = message.address.match(chan))) {
				// This may be a better place to reset our parameter data variables
				// Empty when nothing is selected; some consoles send no argument at all then.
				let chantext = String(message.args?.[0]?.value ?? '')
				let chanarg_matches = chantext.match(/^(\d+)/)

				if (chanarg_matches != null && chanarg_matches.length > 1) {
					let actChan = chanarg_matches[1]
					// if channel changed, we need to get full set of wheel data
					if (actChan != this.lastActChan) {
						this.emptyEncVariables()
						this.requestFullState()
						this.lastActChan = actChan
					}
				} else if (this.lastActChan != 0) {
					// No channel active, clear out encoders, set lastActChan
					// to zero so we don't keep looping on this. Initially set to -1
					this.emptyEncVariables()
					this.requestFullState()
					this.lastActChan = 0
				}
			} 
			
			else if ((matches = message.address.match(labelsUpdated))) {
				// Targets of this type were added, changed or deleted. Indexes may have shifted, so re-read them.
				this.scheduleLabelListRefresh(matches[1])
			} else if ((matches = message.address.match(labelsCount))) {
				this.handleLabelListCount(matches[1], message.args?.[0]?.value)
			} else if ((matches = message.address.match(labels))) {
				// As with cues, the address ends in list/<arg offset>/<arg count>. The target's index in the
				// list is the first argument and its label the third. Some replies have no label argument.
				this.handleLabelListRecord(matches[1], matches[2], message.args?.[0]?.value, message.args?.[2]?.value)
			} else if (message.address === colorhs) {
				// this.log('debug', `HS: ${hue} ${sat}`)
				const hue = Number(message.args?.[0]?.value)
				const sat = Number(message.args?.[1]?.value)
				if (message.args?.length < 2 || !Number.isFinite(hue) || !Number.isFinite(sat)) {
					// No hue/saturation, e.g. the selection has no color parameters.
					this.setInstanceStates({ hue: '', saturation: '' }, true)
					return
				}
				this.setInstanceStates(
					{
						hue: hue.toFixed(3),
						saturation: sat.toFixed(3),
						enc_hue_floatval: hue.toFixed(3),
						enc_hue_stringval: hue.toFixed(3).toString(),
						enc_saturation_floatval: sat.toFixed(3),
						enc_saturation_stringval: sat.toFixed(3).toString(),
						enc_saturationv2_floatval: sat.toFixed(3),
						enc_saturationv2_stringval: sat.toFixed(3).toString(),
					},
					true
				)
			} else if ((matches = message.address.match(enc_wheel))) {
				// set variables/state for wheel values
				let wheel_num = matches[1]

				if (wheel_num >= 1) {
					// this.log('debug', '***** wheel message: ' + JSON.stringify(message))
					let wheelTimer
					let wheel_label = String(message.args?.[0]?.value ?? '')
					let wheel_stringval = '0'
					let wheel_cat = message.args?.[1]?.value || 0
					let wheel_floatval = message.args?.[2]?.value
					if (wheel_floatval != null) {
						wheel_floatval = Number(wheel_floatval)
						wheel_floatval = wheel_floatval.toFixed(3)
					} else {
						wheel_floatval = 0.0
					}

					let wmatches
					wmatches = wheel_label.match(/^([^\[]*)\s*\[([^\]]*)\]/)
					if (wmatches != null && wmatches.length == 3) {
						wheel_label = wmatches[1].trimEnd()
						wheel_stringval = wmatches[2]
					}
					// Update private wheel data
					this.wheels[wheel_num].label = wheel_label
					this.wheels[wheel_num].stringval = wheel_stringval
					this.wheels[wheel_num].cat = wheel_cat
					this.wheels[wheel_num].floatval = wheel_floatval
					// Set individual wheel params we care about specifically
					// as the wheel numbers can change.
					let distinctparam = this.getDistinctParamForWheelLabel(wheel_label)
					if (distinctparam != '') {
						this.setInstanceStates(
							{
								[`${distinctparam}_stringval`]: wheel_stringval,
								[`${distinctparam}_floatval`]: wheel_floatval,
							},
							true
						)
					}
					// if we are not yet reading wheels, set flag to show we are,
					// are set a timeout after 500ms (arbitrary) to process them
					// into category sets. If we get a new one, clear and restart
					// that timer. We don't know how many wheels, so this is a best
					// guess way of knowing when to process them all into groups.
					if (this.readingWheels == false) {
						this.readingWheels = true
						// property, intentionally no 'let'
						wheelTimer = setTimeout(this.doCategoryWheels, 100, this)
					} else {
						// cancel and restart timer waiting for next value
						clearTimeout(wheelTimer)
						// cancelTimeout( wheelTimer )
						wheelTimer = setTimeout(this.doCategoryWheels, 100, this)
					}
				}
			}
		}

		this.oscSocket.on('message', (message) => {
			try {
				handleMessage(message)
			} catch (err) {
				// Name the message, so an unexpected reply format can be traced from the log.
				this.log('error', `Error handling Eos message ${message?.address}: ${err.message}`)
			}
		})

		this.oscSocket.open()

		this.oscSocket.socket.on('close', (error) => {
			this.setConnectionState(false)
		})

		this.oscSocket.socket.on('connect', () => {
			this.setConnectionState(true)
			this.requestFullState()
			this.requestCueList()
			this.requestLabelLists()
		})

		// this.oscSocket.socket.on('ready', () => { })
	}

	/**
	 * Assemble catXX_wheel_* variables after last wheel
	 * parameter received.
	 **/
	doCategoryWheels(self) {
		let variableDefinitions = GetVariableDefinitions(self)
		let updateDefs = {}
		let catWheels = []

		// if we got here, we assume we are done with the batch of wheel info
		self.readingWheels = false

		self.wheels.forEach(function (wheelobj, index, arr, self) {
			if (!catWheels[wheelobj.cat]) {
				catWheels[wheelobj.cat] = []
			}
			catWheels[wheelobj.cat].push(index)
		})
		// Loop through categories 0-6
		for (let i = 0; i <= 6; i++) {
			// nothing in this category
			if (!catWheels[i]) {
				updateDefs[`wheel_cat${i}_count`] = 0
			} else {
				// for( let j=0; j < this.wheelsPerCategory; j++) {
				for (let j = 0; j < Math.min(catWheels[i].length, self.wheelsPerCategory); j++) {
					updateDefs[`cat${i}_wheel_${j + 1}_label`] = self.wheels[catWheels[i][j]].label
					updateDefs[`cat${i}_wheel_${j + 1}_stringval`] = self.wheels[catWheels[i][j]].stringval
					updateDefs[`cat${i}_wheel_${j + 1}_floatval`] = self.wheels[catWheels[i][j]].floatval
					let eosCmd = self.wheels[catWheels[i][j]].label
					if (eosCmd && eosCmd != '') {
						eosCmd = eosCmd.replace(/ /g, '_').replace(/\//g, '\\')
						eosCmd = eosCmd.toLowerCase()
					} else {
						eosCmd = ''
					}
					updateDefs[`cat${i}_wheel_${j + 1}_oscname`] = eosCmd
				}
				updateDefs[`cat${i}_wheel_count`] = catWheels[i].length
			}
		}
		self.setVariableValues(updateDefs)
	}

	/**
	 * Reset our internal variables
	 */
	emptyEncVariables() {
		let variableDefinitions = GetVariableDefinitions(this)
		let updateDefs = {}
		variableDefinitions.forEach(function (varDef) {
			if (
				varDef['variableId'].startsWith('enc_') ||
				// || varDef['variableId'].startsWith('wheel_') // deprecated
				/^cat\d_/.test(varDef['variableId'])
			) {
				updateDefs[varDef['variableId']] = ''
			}
		}, this)
		this.setVariableValues(updateDefs)
		this.emptyWheelData()
	}

	clearLabelListTimers() {
		for (const list of Object.values(this.labelLists || {})) {
			for (const timer of ['refreshTimer', 'pendingTimer']) {
				if (list[timer] !== undefined) {
					clearTimeout(list[timer])
					delete list[timer]
				}
			}
		}
		if (this.labelDefinitionsTimer !== undefined) {
			clearTimeout(this.labelDefinitionsTimer)
			delete this.labelDefinitionsTimer
		}
	}

	/**
	 * Requests the group, preset and macro labels from the console.
	 */
	requestLabelLists() {
		for (const type of constants.LABEL_NAMES) {
			this.requestLabelList(type)
		}
	}

	/**
	 * Asks the console how many targets of this type exist. The answer is handled by handleLabelListCount,
	 * which then requests each one by index. The current values stay until the new ones have arrived.
	 */
	requestLabelList(type) {
		const list = this.labelLists[type]
		if (list.refreshTimer !== undefined) {
			clearTimeout(list.refreshTimer)
			delete list.refreshTimer
		}
		this.sendOsc(`/eos/get/${type}/count`, [], false)
	}

	/**
	 * Re-reads a label list shortly, so a burst of change notifications results in a single refresh.
	 */
	scheduleLabelListRefresh(type) {
		const list = this.labelLists[type]
		if (list.refreshTimer !== undefined) {
			clearTimeout(list.refreshTimer)
		}
		list.refreshTimer = setTimeout(() => {
			delete list.refreshTimer
			this.requestLabelList(type)
		}, 500)
	}

	handleLabelListCount(type, count) {
		const list = this.labelLists[type]
		count = Number(count)
		if (!list || !Number.isFinite(count) || count < 0) {
			return
		}

		if (list.pendingTimer !== undefined) {
			clearTimeout(list.pendingTimer)
			delete list.pendingTimer
		}

		list.pending = new Map()
		list.expected = Math.min(count, this.getNumLabelsToPoll())
		if (list.expected === 0) {
			this.applyLabelList(type)
			return
		}

		for (let i = 0; i < list.expected; i++) {
			this.sendOsc(`/eos/get/${type}/index/${i}`, [], false)
		}

		// Don't wait forever if a reply goes missing; use what has arrived.
		list.pendingTimer = setTimeout(() => {
			delete list.pendingTimer
			this.applyLabelList(type)
		}, 5000)
	}

	handleLabelListRecord(type, targetNumber, index, label) {
		const list = this.labelLists[type]
		if (!list || list.pending === undefined) {
			// Not part of a list we asked for.
			return
		}
		if (index === undefined || index === null || index === '' || !Number.isFinite(Number(index))) {
			return
		}
		index = Number(index)
		if (index >= list.expected) {
			return
		}

		list.pending.set(index, { num: targetNumber, label: label === undefined || label === null ? '' : String(label) })
		if (list.pending.size >= list.expected) {
			this.applyLabelList(type)
		}
	}

	/**
	 * Replaces a type's labels with the newly read ones, and updates the variables (and presets) to match.
	 */
	applyLabelList(type) {
		const list = this.labelLists[type]
		if (list.pending === undefined) {
			return
		}
		if (list.pendingTimer !== undefined) {
			clearTimeout(list.pendingTimer)
			delete list.pendingTimer
		}

		list.records = [...list.pending.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1])
		list.pending = undefined

		const numbers = list.records.map((record) => record.num)
		const defined = this.labelDefinedNumbers[type]
		const definitionsChanged = numbers.length !== defined.length || numbers.some((num, i) => num !== defined[i])

		if (definitionsChanged) {
			// Batch definition and preset rebuilds, as the three types usually arrive together.
			if (this.labelDefinitionsTimer === undefined) {
				this.labelDefinitionsTimer = setTimeout(() => {
					delete this.labelDefinitionsTimer
					for (const t of constants.LABEL_NAMES) {
						this.labelDefinedNumbers[t] = this.labelLists[t].records.map((record) => record.num)
					}
					this.setVariableDefinitions(GetVariableDefinitions(this))
					this.updatePresets()
					for (const t of constants.LABEL_NAMES) {
						this.setLabelListValues(t)
					}
				}, 100)
			}
		} else {
			this.setLabelListValues(type)
		}
	}

	setLabelListValues(type) {
		const values = {}
		for (const record of this.labelLists[type].records) {
			values[`${type}_label_${this.cueNumberToVariableId(record.num)}`] = record.label
		}
		if (Object.keys(values).length > 0) {
			this.setInstanceStates(values, true)
		}
	}

	/**
	 * Converts a cue number into something usable in a variable id (variable ids can't contain dots).
	 */
	cueNumberToVariableId(cueNumber) {
		return String(cueNumber).replace(/\./g, '_')
	}

	clearCueListTimers() {
		if (this.cueListRefreshTimer !== undefined) {
			clearTimeout(this.cueListRefreshTimer)
			delete this.cueListRefreshTimer
		}
		if (this.cueListDefinitionsTimer !== undefined) {
			clearTimeout(this.cueListDefinitionsTimer)
			delete this.cueListDefinitionsTimer
		}
	}

	/**
	 * Forgets all cue list data and empties the related variables.
	 */
	clearCueList() {
		if (this.cueListDefinitionsTimer !== undefined) {
			clearTimeout(this.cueListDefinitionsTimer)
			delete this.cueListDefinitionsTimer
		}
		this.cueListRecords = new Map()

		// Drop the per-cue-number variables, and re-create the positional ones for the configured count.
		this.cueListDefinedNumbers = []
		this.setVariableDefinitions(GetVariableDefinitions(this))

		const emptyValues = { cue_list_count: '' }
		for (let i = 1; i <= this.getNumCuesToPoll(); i++) {
			emptyValues[`cue_index_${i}_num`] = ''
			emptyValues[`cue_index_${i}_label`] = ''
		}
		this.setInstanceStates(emptyValues, true)
	}

	/**
	 * Requests the cues of the configured cue list from the console.
	 * The console first answers with the cue count (see handleCueListCount).
	 */
	requestCueList() {
		if (this.cueListRefreshTimer !== undefined) {
			clearTimeout(this.cueListRefreshTimer)
			delete this.cueListRefreshTimer
		}
		this.clearCueList()

		if (this.isCueListPollingEnabled()) {
			this.sendOsc(`/eos/get/cue/${this.getCueListToPoll()}/count`, [], false)
		}
	}

	/**
	 * Re-reads the cue list shortly, so a burst of change notifications results in a single refresh.
	 */
	scheduleCueListRefresh() {
		if (this.cueListRefreshTimer !== undefined) {
			clearTimeout(this.cueListRefreshTimer)
		}
		this.cueListRefreshTimer = setTimeout(() => {
			delete this.cueListRefreshTimer
			this.requestCueList()
		}, 500)
	}

	handleCueListCount(cueList, count) {
		if (Number(cueList) !== this.getCueListToPoll() || !this.isCueListPollingEnabled()) {
			return
		}

		count = Number(count)
		if (!Number.isFinite(count) || count < 0) {
			return
		}

		this.setInstanceStates({ cue_list_count: String(count) }, true)

		const toRequest = Math.min(count, this.getNumCuesToPoll())
		for (let i = 0; i < toRequest; i++) {
			this.sendOsc(`/eos/get/cue/${cueList}/index/${i}`, [], false)
		}
	}

	handleCueListRecord(cueList, cueNumber, cuePart, index, label) {
		if (Number(cueList) !== this.getCueListToPoll() || !this.isCueListPollingEnabled()) {
			return
		}

		// Only the cue itself (part 0) is tracked, not its parts.
		if (Number(cuePart) !== 0) {
			return
		}

		if (index === undefined || index === null || index === '' || !Number.isFinite(Number(index))) {
			return
		}
		index = Number(index)

		this.cueListRecords.set(index, { num: cueNumber, label: label || '' })
		this.updateCueListVariables()
	}

	/**
	 * The cues read so far, in list order, limited to the configured number of cues.
	 */
	getSortedCueListRecords() {
		return [...this.cueListRecords.entries()]
			.sort((a, b) => a[0] - b[0])
			.slice(0, this.getNumCuesToPoll())
			.map((entry) => entry[1])
	}

	/**
	 * Recomputes the cue_index_X_* variables, and the cue_N_label variables once their definitions exist.
	 */
	updateCueListVariables() {
		const cues = this.getSortedCueListRecords()

		const values = {}
		for (let i = 1; i <= this.getNumCuesToPoll(); i++) {
			const cue = cues[i - 1]
			values[`cue_index_${i}_num`] = cue ? cue.num : ''
			values[`cue_index_${i}_label`] = cue ? cue.label : ''
		}

		const cueNumbers = cues.map((cue) => cue.num)
		const definitionsChanged =
			cueNumbers.length !== this.cueListDefinedNumbers.length ||
			cueNumbers.some((num, i) => num !== this.cueListDefinedNumbers[i])

		if (!definitionsChanged) {
			for (const cue of cues) {
				values[`cue_${this.cueNumberToVariableId(cue.num)}_label`] = cue.label
			}
		} else if (this.cueListDefinitionsTimer === undefined) {
			// New cue numbers need new variable definitions. Batch them, as cues arrive one message at a time.
			this.cueListDefinitionsTimer = setTimeout(() => {
				delete this.cueListDefinitionsTimer
				this.cueListDefinedNumbers = this.getSortedCueListRecords().map((cue) => cue.num)
				this.setVariableDefinitions(GetVariableDefinitions(this))
				this.updateCueListVariables()
			}, 250)
		}

		this.setInstanceStates(values, true)
	}

	/**
	 * Empties the state (variables/feedbacks) and requests the current state from the console.
	 */
	requestFullState() {
		this.emptyState()

		// Request the current state of the console.
		this.sendOsc('/eos/reset', [], false)

		// Switch to the correct user_id.
		this.sendOsc('/eos/user', [{ type: 'i', value: this.config.user_id }], false)

		// Turn on subscription for show file event updates
		this.sendOsc('/eos/subscribe', [{ type: 'i', value: 1 }], false)

		this.sendOsc('get/version', [])

		// Labels aren't requested here: this runs on every channel selection change, and labels don't depend
		// on the selection. They're read on connect, on show load, and when the console reports a change.
	}

	/**
	 * Empties the state (variables/feedbacks).
	 */
	emptyState() {
		// Empty the state, but preserve the connected state.
		this.instanceState = {
			connected: this.instanceState['connected'],
		}

		this.checkFeedbacks('pending_cue', 'active_cue', 'connected', 'macroisfired')
	}

	/**
	 * Parses a cue's name (and the additional information within it) and updates the internal state.
	 */
	parseCueName(type, cueName) {
		// Cue name will look something like:
		//  51.1 Drums 3.0 100%
		//  <CUE NUMBER> <LABEL> <DURATION> [<INTENSITY PERCENTAGE>]
		//
		// or, if the cue doesn't have a label:
		//  51.1 3.0 100%
		//  <CUE NUMBER> <DURATION> [<INTENSITY PERCENTAGE>]
		// let matches = cueName.match(/^(?<CUE_NUMBER>[\d\.]+)( (?<LABEL>.*?))? (?<DURATION>[\d\.]+)( (?<INTENSITY>[\d\.]+%))?$/)
		//
		// Fixed to accommodate CUE NUMBER of list/cue, as in 1/1.
		//
		// If the CUE value is " 0.0" then reset active cue list/number
		const cuematch =
			/^(?<CUE_NUMBER>[\d\.]+\/[\d\.]+|[\d\.]+)?(?<CUE_LIST>\/[\d\.]+)?( (?<LABEL>.*?))? (?<DURATION>[\d\.]+)( (?<INTENSITY>[\d\.]+%))?$/
		let matches = cueName.match(cuematch)

		if (matches !== null && matches.length >= 6) {
			// Parse the response.
			const newValues = {
				[`cue_${type}_label`]: matches[3] || matches[2], // Use cue number if label not available.
				[`cue_${type}_duration`]: matches[5],
			}

			if (matches.length === 8) {
				newValues[`cue_${type}_intensity`] = matches[7]
			}

			this.setInstanceStates(newValues, true)
		} else {
			// Use as-is. Couldn't parse properly.
			this.setInstanceStates(
				{
					[`cue_${type}_label`]: cueName,
				},
				true
			)
		}
		// Clear out when active cue is no longer active
		if ('active' == type && (' 0.0 ' == cueName.substring(0, 5) || '' == cueName)) {
			this.setInstanceStates(
				{
					cue_active_list: '',
					cue_active_num: '',
				},
				true
			)
			this.checkFeedbacks('active_cue')
		}
	}

	/**
	 * Sends the path to the OSC host.
	 *
	 * @param path          The OSC path to send
	 * @param args          An array of arguments, or empty if no arguments needed
	 * @param appendPrefix  Whether to append the '/eos/' prefix to the command.
	 */
	sendOsc(path, args, appendPrefix) {
		if (!this.config.host) {
			return
		}

		if (appendPrefix !== false) {
			path = `/eos/${path}`
		}

		let packet = {
			address: path,
			args: args,
		}

		if (this.debugToLogger) {
			this.log('info', `Eos: Sending packet: ${JSON.stringify(packet)}`)
		}

		this.oscSocket.send(packet)
	}

	/*
	 * For actions
	 */
	setIntensity(prefix, id, value) {
		let suffix = ''
		let arg = []
		if (!isNaN(value)) {
			// Numeric value as a percentage
			if (prefix == 'sub') {
				// Value must be a float from 0.0 to 1.0 for subs.
				arg = [{ type: 'f', value: Math.min(100, parseFloat(value)) / 100.0 }]
			} else {
				// Value must be an int from 1 to 100 for chans/groups.
				arg = [{ type: 'f', value: Math.min(100, parseInt(value)) }]
			}
		} else {
			// A special command, like "min", "max", "out", "full. Append to command.
			suffix = `/${value}`
		}

		this.sendOsc(`${prefix}/${id}${suffix}`, arg)
	}

	getDistinctParamForWheelLabel(wheel_label) {
		let distinctparam = ''
		if (wheel_label != null && wheel_label != '') {
			let lc_wheel_label = wheel_label.toLowerCase()
			if (lc_wheel_label in ParamMap) {
				distinctparam = ParamMap[lc_wheel_label]
			}
		}
		return distinctparam
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)