const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const { GetVariableDefinitions, UpdateVariableDefinitions } = require('./variables')
const UpdatePresetDefinitions = require('./presets')
const { ParamMap } = require('./param_map')

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
		this.eos_port = this.config.use_slip ? 3037 : 3032
		this.readingWheels = false
		
		// Wheel information as module only variables, not exposed
		this.wpc = 20
		this.wheelsPerCategory = 20
		this.wheels = []
		this.emptyWheelData() // clear out encoder wheel values

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets() // export presets

		this.oscSocket = this.getOsc10Socket(this.config.host, this.eos_port )
		this.setOscSocketListeners()
		this.startReconnectTimer()
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
		
		this.config = config

		if (currentHost !== this.config.host || currentUserId !== this.config.user_id
			|| currentUseSlip !== this.config.use_slip ) {
			this.closeOscSocket()
			this.eos_port = this.config.use_slip ? 3037 : 3032
			await this.init(config)
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
		]
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
				this.log('debug', `Error: ${err.message}`)
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
		const showLoaded = '/eos/out/event/show/loaded'
		const showCleared = '/eos/out/event/show/cleared'
		const softkey = /^\/eos\/out\/softkey\/(\d+)$/
		const cmd = /^\/eos\/out\/user\/(\d+)\/cmd$/
		const chan = '/eos/out/active/chan'

		// This is the raw OSC message, but we are getting something parsed already...
		// const enc_wheel      = /^\/eos\/out\/active\/wheel\/(\d+),\s*(\w+)\s*\[(\w+)\]\(s\).\s+(\d+)\(i\),\s*([\d.]*)\(f\)$/
		const enc_wheel = /^\/eos\/out\/active\/wheel\/(\d+)/

		this.oscSocket.on('message', (message, self ) => {
			if (this.debugToLogger) {
				this.log('debug', `Eos OSC message args: ${JSON.stringify(message.args)}`)
				this.log('debug', `Eos OSC message: ${message.address}`)
			}

			let matches

			if (matches = message.address.match(cueActive)) {
				this.setInstanceStates(
					{
						cue_active_list: matches[1],
						cue_active_num: matches[2],
					},
					true
				)
				this.checkFeedbacks('active_cue')
			} else if (message.address === cueActiveText) {
				this.parseCueName('active', message.args[0].value)
			} else if ((matches = message.address.match(cuePending))) {
				this.setInstanceStates(
					{
						cue_pending_list: matches[1],
						cue_pending_num: matches[2],
					},
					true
				)
				this.checkFeedbacks('pending_cue')
			} else if (message.address === cuePendingOut && message.args.length == 0 ) {
				this.setInstanceStates(
					{
					cue_pending_list: '',
					cue_pending_num: '',
					},
					true
				)
			} else if (message.address === cuePendingText) {
				this.parseCueName('pending', message.args[0].value)
			} else if ((matches = message.address.match(cuePrevious))) {
				this.setInstanceStates(
					{
						cue_previous_list: matches[1],
						cue_previous_num: matches[2],
					},
					true
				)
				this.checkFeedbacks('previous_cue')
			} else if (message.address === cuePreviousOut && message.args.length == 0 ) {
				this.setInstanceStates(
					{
					cue_previous_list: '',
					cue_previous_num: '',
					},
					true
				)
			} else if (message.address === cuePreviousText) {
				this.parseCueName('previous', message.args[0].value)
			} else if (message.address === showName && message.args.length === 1 && message.args[0].type === 's') {
				this.setInstanceStates(
					{
						show_name: message.args[0].value,
					},
					true
				)
			} else if (message.address === showLoaded || message.address === showCleared) {
				// Reset the state when a show is loaded or a new show is created.
				this.requestFullState()
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
							cmd: message.args[0].value,
						},
						true
					)
				}
			} else if ((matches = message.address.match(chan))) {
				// This may be a better place to reset our parameter data variables
				let chantext = message.args[0].value
				let chanarg_matches = chantext.match(/^(\d+)/)

				if (chanarg_matches != null && chanarg_matches.length > 1) {
					let actChan = chanarg_matches[1]
					// if channel changed, we need to get full set of wheel data
					if (actChan != this.lastActChan) {
						this.emptyEncVariables()
						this.requestFullState()
						this.lastActChan = actChan
					}
				} else if ( this.lastActChan != 0 ) {
					// No channel active, clear out encoders, set lastActChan
					// to zero so we don't keep looping on this. Initially set to -1
					this.emptyEncVariables()
					this.requestFullState()
					this.lastActChan = 0
				}
			} else if ((matches = message.address.match(enc_wheel))) {
				// set variables/state for wheel values
				let wheel_num = matches[1]

				if (wheel_num >= 1) {
					// this.log('debug', '***** wheel message: ' + JSON.stringify(message))
					let wheelTimer
					let wheel_label = message.args[0].value
					let wheel_stringval = '0'
					let wheel_cat = message.args[1].value || 0
					let wheel_floatval = message.args[2].value
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
					if ( this.readingWheels == false ) {
						this.readingWheels = true
						// property, intentionally no 'let'
						wheelTimer = setTimeout( this.doCategoryWheels, 100, this )
					} else {
						// cancel and restart timer waiting for next value
						clearTimeout( wheelTimer )
						// cancelTimeout( wheelTimer )
						wheelTimer = setTimeout( this.doCategoryWheels, 100, this )
					}
				}
			}
		})

		this.oscSocket.open()

		this.oscSocket.socket.on('close', (error) => {
			this.setConnectionState(false)
		})

		this.oscSocket.socket.on('connect', () => {
			this.setConnectionState(true)
			this.requestFullState()
		})

		// this.oscSocket.socket.on('ready', () => { })
	}

	/**
	 * Assemble catXX_wheel_* variables after last wheel
	 * parameter received.
	 **/
	 doCategoryWheels( self ) {
		let variableDefinitions = GetVariableDefinitions( self )
		let updateDefs = {}
		let catWheels = []

		// if we got here, we assume we are done with the batch of wheel info
		self.readingWheels = false

		self.wheels.forEach ( function (wheelobj, index, arr, self ) {
			if ( ! catWheels[ wheelobj.cat ] ) {
				catWheels[ wheelobj.cat ] = []
			}
			catWheels[ wheelobj.cat ].push( index )
		})
		// Loop through categories 0-6
		for( let i=0; i <= 6; i++ ) {
			// nothing in this category
			if ( ! catWheels[i] ) {
				updateDefs[`wheel_cat${i}_count`] = 0
			} else {
				// for( let j=0; j < this.wheelsPerCategory; j++) {
				for ( let j=0; j < Math.min( catWheels[i].length, self.wheelsPerCategory ); j++ ) {
					updateDefs[`cat${i}_wheel_${j+1}_label`] = self.wheels[ catWheels[i][j] ].label
					updateDefs[`cat${i}_wheel_${j+1}_stringval`] = self.wheels[ catWheels[i][j] ].stringval
					updateDefs[`cat${i}_wheel_${j+1}_floatval`] = self.wheels[ catWheels[i][j]].floatval
					let eosCmd = self.wheels[ catWheels[i][j] ].label
					if( eosCmd && eosCmd != '' ) {
						eosCmd = eosCmd.replace( / /g, '_').replace(/\//g, '\\')
						eosCmd = eosCmd.toLowerCase()
					} else {
						eosCmd = ''
					}
					updateDefs[`cat${i}_wheel_${j+1}_oscname`] = eosCmd
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
		let variableDefinitions = GetVariableDefinitions( this )
		let updateDefs = {}
		variableDefinitions.forEach(function (varDef) {
			if (varDef['variableId'].startsWith('enc_')
					// || varDef['variableId'].startsWith('wheel_') // deprecated
					|| /^cat\d_/.test(varDef['variableId']) ) {
				updateDefs[varDef['variableId']] = ''
			}
		}, this)
		this.setVariableValues(updateDefs)
		this.emptyWheelData()
	}

	/**
	 * Empties the state (variables/feedbacks) and requests the current state from the console.
	 */
	requestFullState() {
		this.emptyState()

		// Request the current state of the console.
		this.sendOsc('/eos/reset', [], false)

		// Switch to the correct user_id.
		this.sendOsc('/eos/user', [ { type: 'i', value: this.config.user_id } ], false)
	}

	/**
	 * Empties the state (variables/feedbacks).
	 */
	emptyState() {
		// Empty the state, but preserve the connected state.
		this.instanceState = {
			connected: this.instanceState['connected'],
		}

		this.checkFeedbacks('pending_cue', 'active_cue', 'connected')
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
			/^(?<CUE_NUMBER>[\d\.]+\/[\d\.]+|[\d\.]+)?(?<CUEWLIST>\/[\d\.]+)?( (?<LABEL>.*?))? (?<DURATION>[\d\.]+)( (?<INTENSITY>[\d\.]+%))?$/
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
		// Clear out when active cue is no longer activve
		if ( "active" == type &&
		       ( " 0.0 " == cueName.substring(0,5)
				||
				"" == cueName )
	    	) {
			this.setInstanceStates(
				{
				cue_active_list: '',
				cue_active_num: '',
				},
				true
			)
		}
	}

	/**
	 * Sends the path to the OSC host.
	 *
	 * @param path          The OSC path to send
	 * @param args          An array of arguments, or empty if no arguments needed
	 * @param appendUser    Whether to append the '/eos/' prefix to the command.
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
			this.log('warn', `Eos: Sending packet: ${JSON.stringify(packet)}`)
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
		if ( wheel_label != null && wheel_label != '' ) {
			let lc_wheel_label = wheel_label.toLowerCase()
			if ( lc_wheel_label in ParamMap ) {
				distinctparam = ParamMap[ lc_wheel_label ]
			}
		}
		return distinctparam
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
