const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const UpdatePresetDefinitions = require('./presets')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config

		this.updateStatus(InstanceStatus.Disconnected)

		this.instanceState = {}
		this.debugToLogger = true

		this.EOS_OSC_PORT = 3032

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresets() // export presets

		this.oscSocket = this.getOsc10Socket(this.config.host, this.EOS_OSC_PORT)
		this.setOscSocketListeners()
		this.startReconnectTimer()
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
		let currentUserId = this.config.userid

		this.config = config

		if (currentHost !== this.config.host || currentUserId !== this.config.userid) {
			this.closeOscSocket()
			await this.init()
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
				id: 'userid',
				label: 'User ID',
				default: 1,
				width: 4,
				regex: '/^(-1|0|\\d+)$/',
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

			if (selthisf.oscSocket.socket !== undefined) {
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
			if (
				this.oscSocket !== undefined &&
				this.oscSocket.socket !== undefined &&
				this.oscSocket.socket.readyState === 'open'
			) {
				// Already connected. Nothing to do.
				return
			}

			// Re-open the TCP socket
			this.oscSocket.socket.connect(this.EOS_OSC_PORT, this.config.host)
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
			useSLIP: false,
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
		const showName = '/eos/out/show/name'
		const showLoaded = '/eos/out/event/show/loaded'
		const showCleared = '/eos/out/event/show/cleared'
		const softkey = /^\/eos\/out\/softkey\/(\d+)$/
		const cmd = /^\/eos\/out\/user\/(\d+)\/cmd$/

		// This is the raw OSC message, but we are getting something parsed already...
		// const enc_wheel      = /^\/eos\/out\/active\/wheel\/(\d+),\s*(\w+)\s*\[(\w+)\]\(s\).\s+(\d+)\(i\),\s*([\d.]*)\(f\)$/
		const enc_wheel = /^\/eos\/out\/active\/wheel\/(\d+)/

		this.oscSocket.on('message', (message) => {
			if (this.debugToLogger) {
				this.log('debug', `Eos OSC message args: ${JSON.stringify(message.args)}`)
				this.log('debug', `Eos OSC message: ${message.address}`)
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
			} else if (message.address === cuePendingText) {
				this.parseCueName('pending', message.args[0].value)
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
				let user_id = matches[1]
				if (user_id === this.config.user_id || this.config.user_id === '-1') {
					this.setInstanceStates(
						{
							cmd: message.args[0].value,
						},
						true
					)
				}
			}

			// set variables/state for wheel values
			else if ((matches = message.address.match(enc_wheel))) {
				let wheel_num = matches[1]

				if (wheel_num >= 1) {
					let wheel_label = message.args[0].value
					let wheel_stringval = ''
					let wheel_cat = message.args[1].value || ''
					let wheel_floatval = message.args[2].value + 0 || '0'
					wheel_floatval = wheel_floatval.toFixed(2)

					let wmatches
					wmatches = wheel_label.match(/^([^\[]*)\s*\[([^\]]*)\]/)
					if (wmatches != null && wmatches.length == 3) {
						wheel_label = wmatches[1].trimEnd()
						wheel_stringval = wmatches[2]
					}
					this.setInstanceStates(
						{
							[`wheel_label_${wheel_num}`]: wheel_label,
							[`wheel_stringval_${wheel_num}`]: wheel_stringval,
							[`wheel_cat_${wheel_num}`]: wheel_cat,
							[`wheel_floatval_${wheel_num}`]: wheel_floatval,
						},
						true
					)
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
	 * Empties the state (variables/feedbacks) and requests the current state from the console.
	 */
	requestFullState() {
		this.emptyState()

		// Request the current state of the console.
		this.sendOsc('/eos/reset', [], false)

		// Switch to the correct user_id.
		this.sendOsc(`/eos/user=${this.config.user_id}`, [], false)
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
			if (action.action === 'sub_intensity') {
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
}

runEntrypoint(ModuleInstance, UpgradeScripts)
