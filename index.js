var instance_skel = require('../../instance_skel');

var debug;
var log;


function instance(system, id, config) {

	// super-constructor
	instance_skel.apply(this, arguments);

	this.actions();
	return this;

}


/**
 * The module's config was updated. Restart the socket if needed.
 */
instance.prototype.updateConfig = function(config) {
	let self = this;

	// The port config option is no longer needed
	delete config.port;

	let currentHost   = self.config.host;
	let currentUserId = self.config.user_id;
	self.config = config;

	if (currentHost !== self.config.host || currentUserId !== self.config.user_id) {
		// User ID or IP changed.
		// Reconnect.
		self.closeOscSocket();
		self.init();
	}

}


/**
 * Initializes the module and sets its state.
 */
instance.prototype.init = function() {
	this.status(this.STATE_UNKNOWN);

	debug = this.debug;
	log = this.log;

	this.EOS_OSC_PORT = 3032;
	this.instanceState = {};
	this.debugToLogger = false;

	this.defineDynamicVariables();
	this.defineFeedbacks();
	this.definePresets();

	// The port for TCP OSC is always 3032
	this.oscSocket = this.getOsc10Socket(this.config.host, this.EOS_OSC_PORT);

	this.setOscSocketListeners();
	this.startReconnectTimer();

}


/**
 * Handle when a module gets deleted or disabled.
 */
instance.prototype.destroy = function() {

	// Clear the reconnect timer if it exists.
	if (this.reconnectTimer !== undefined) {
		clearInterval(this.reconnectTimer);
		delete this.reconnectTimer;
	}

	// Close the socket.
	this.closeOscSocket();

	debug('destroy');

}


/**
 * Defines the dynamic variables this module will expose. Initialize all variables to a default value.
 */
instance.prototype.defineDynamicVariables = function() {
	let self = this;
	let variables = [];

	variables.push({ name: 'cue_active_list', label: 'The active cue list number' });
	variables.push({ name: 'cue_active_num', label: 'The active cue number' });
	variables.push({ name: 'cue_active_label', label: 'The active cue label' });
	variables.push({ name: 'cue_active_duration', label: 'The active cue duration in seconds' });
	variables.push({ name: 'cue_active_intensity', label: 'The active cue intensity percent' });

	variables.push({ name: 'cue_pending_list', label: 'The pending cue list number' });
	variables.push({ name: 'cue_pending_num', label: 'The pending cue number' });
	variables.push({ name: 'cue_pending_label', label: 'The pending cue label' });
	variables.push({ name: 'cue_pending_duration', label: 'The pending cue duration in seconds' });

	variables.push({ name: 'cmd', label: 'The current command line output for the user' });
	variables.push({ name: 'show_name', label: 'The name of the show' });

	// There are 6 soft keys, and 6 alternates (exposed with {More SK}).
	for (let i=1; i<=12; i++) {
		variables.push({ name: `softkey_label_${i}`, label: `Soft key ${i}'s label` });
	}

	self.setVariableDefinitions(variables);

	// Initialize the default values for the variables
	for (let i=0; i<variables.length; i++) {
		self.setVariable(variables[i].name, '');
	}

}


/**
 * Defines the feedbacks this module will expose.
 */
instance.prototype.defineFeedbacks = function() {
	let self = this;
	let feedbacks = {};

	feedbacks['pending_cue'] = {
		label: 'When cue is pending',
		description: "Changes the button's style when this cue is pending.",
		options: [
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(204, 102, 0)
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255, 255, 255)
			},
			{
				type: 'textinput',
				label: 'Cue List',
				id: 'list',
				default: '1',
				regex: this.REGEX_NUMBER,
			},
			{
				type: 'textinput',
				label: 'Cue Number',
				id: 'number',
				default: '1',
				regex: this.REGEX_FLOAT_OR_INT,
			},
		],
	};

	feedbacks['active_cue'] = {
		label: 'When cue is active',
		description: "Changes the button's style when this cue is active.",
		options: [
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(51, 102, 0)
			},
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255, 255, 255)
			},
			{
				type: 'textinput',
				label: 'Cue List',
				id: 'list',
				default: '1',
				regex: this.REGEX_NUMBER,
			},
			{
				type: 'textinput',
				label: 'Cue Number',
				id: 'number',
				default: '1',
				regex: this.REGEX_FLOAT_OR_INT,
			},
		],
	};

	feedbacks['connected'] = {
		label: 'When connection to console changes',
		description: 'Change colors when the connection state to the console changes',
		options: [
			{
				type: 'colorpicker',
				label: 'Foreground color',
				id: 'fg',
				default: self.rgb(255, 255, 255),
			},
			{
				type: 'colorpicker',
				label: 'Background color',
				id: 'bg',
				default: self.rgb(51, 102, 0),
			},
			{
				type: 'checkbox',
				label: 'Is connected',
				id: 'connected',
				default: true,
			},
		],
	};

	self.setFeedbackDefinitions(feedbacks);

}


/**
 * Define the presets for the buttons.
 */
instance.prototype.definePresets = function() {
	let self = this;
	let presets = [];
	
	presets.push({
		category: 'Cues',
		label: 'A button to trigger a cue, and feedbacks to show if the cue is active.',
		bank: {
			style: 'text',
			text: 'Cue\\n#',
			size: '14',
			color: self.rgb(255,255,255),
			bgcolor: 0,
		},
		actions: [{
			action: 'run_cue',
			options: {
				list: '1',
				number: '#',
			},
		}],
		feedbacks: [{
			type: 'pending_cue',
			options : {
				list: '1',
				number: '#',
			}
		},{
			type: 'active_cue',
			options : {
				list: '1',
				number: '#',
			}
		}]
	});
	
	presets.push({
		category: 'Cues',
		label: "The Go cue button. Also shows the cue's intensity.",
		bank: {
			style: 'text',
			text: 'Go $('+self.package_info.name+':cue_pending_num)\\n$('+self.package_info.name+':cue_active_intensity)',
			size: '14',
			color: self.rgb(255,255,255),
			bgcolor: self.rgb(51,102,0),
		},
		actions: [{
			action: 'next_cue',
			options: { },
		}]
	});

	presets.push({
		category: 'Cues',
		label: 'The Stop/Back cue button.',
		bank: {
			style: 'text',
			text: 'Stop/Back',
			size: '14',
			color: self.rgb(255,255,255),
			bgcolor: self.rgb(204,102,0),
		},
		actions: [{
			action: 'stop_back',
			options: { },
		}]
	});

	presets.push({
		category: 'Status',
		label: 'Shows the current cue number and label.',
		bank: {
			style: 'text',
			text: 'Live cue:\\n$('+self.package_info.name+':cue_active_num): $('+self.package_info.name+':cue_active_label)',
			size: '7',
			color: self.rgb(255,255,255),
			bgcolor: self.rgb(0,0,153),
		}
	});

	presets.push({
		category: 'Status',
		label: 'Shows the current show name.',
		bank: {
			style: 'text',
			text: 'Show name:\\n$('+self.package_info.name+':show_name)',
			size: '7',
			color: self.rgb(255,255,255),
			bgcolor: self.rgb(0,0,153),
		}
	});

	presets.push({
		category: 'Status',
		label: 'Shows the command line for the current user.',
		bank: {
			style: 'text',
			text: '$('+self.package_info.name+':cmd)',
			size: '7',
			color: self.rgb(255,255,255),
			bgcolor: self.rgb(0,0,153),
		}
	});

	self.setPresetDefinitions(presets);

}


/**
 * Returns a button's new style if feedback is appropriate.
 */
instance.prototype.feedback = function(feedback) {
	let self = this;

	if (self.instanceState === undefined) {
		return;
	}

	if (feedback.type === 'pending_cue')  {
		// The pending cue changed. Update the button's style if this is the correct cue.

		if (feedback.options.list === self.instanceState['cue_pending_list'] &&
				feedback.options.number === self.instanceState['cue_pending_num']) {

			return {
				color   : feedback.options.fg,
				bgcolor : feedback.options.bg,
			};

		}
	}

	if (feedback.type === 'active_cue')  {
		// The active cue changed. Update the button's style if this is the correct cue.

		if (feedback.options.list === self.instanceState['cue_active_list'] &&
				feedback.options.number === self.instanceState['cue_active_num']) {

			return {
				color   : feedback.options.fg,
				bgcolor : feedback.options.bg,
			};

		}

	}

	if (feedback.type === 'connected') {
		// The connection to the console changed.

		if (feedback.options.connected === self.instanceState['connected']) {

			return {
				color   : feedback.options.fg,
				bgcolor : feedback.options.bg,
			};

		}

	}

	return {};

}


/**
 * Sets the connection state of this module to the Eos console.
 * 
 * @param isConnected
 */
instance.prototype.setConnectionState = function(isConnected) {
	let self = this;
	let currentState = self.instanceState['connected'];

	self.status(isConnected ? self.STATE_OK : self.STATE_ERROR);
	self.setInstanceState('connected', isConnected);

	if (currentState !== isConnected) {
		// The connection state changed. Update the feedback.
		self.checkFeedbacks('connected');
	}

}


/**
 * Closes the OSC socket.
 */
instance.prototype.closeOscSocket = function() {
	let self = this;

	if (self.oscSocket !== undefined) {
		self.oscSocket.close();

		if (self.oscSocket.socket !== undefined) {
			self.oscSocket.socket.destroy();
			delete self.oscSocket.socket;
		}

		delete self.oscSocket;
	}

	self.emptyState();

}


/**
 * Watches for disconnects and reconnects to the console.
 */
instance.prototype.startReconnectTimer = function() {
	let self = this;

	if (self.reconnectTimer !== undefined) {
		// Timer is already running.
		return;
	}

	self.reconnectTimer = setInterval(() => {

		if (self.oscSocket !== undefined && self.oscSocket.socket !== undefined && self.oscSocket.socket.readyState === 'open') {
			// Already connected. Nothing to do.
			return;
		}

		// Re-open the TCP socket
		self.oscSocket.socket.connect(self.EOS_OSC_PORT, self.config.host);
	
	}, 5000);

}


/**
 * Updates the internal state of a variable within this module.
 * 
 * Optionally updates the dynamic variable with its new value.
 */
instance.prototype.setInstanceState = function(variable, value, isVariable) {
	let self = this;

	self.instanceState[variable] = value;

	if (isVariable) {
		self.setVariable(variable, value);
	}

}


/**
 * Returns the monkey-patched OSC connection to the console.
 */
instance.prototype.getOsc10Socket = function (address, port) {
	let self = this;

	let OSC10 = require('osc');
	let slip  = require("slip");

	// OSC 1.0 encodes the packet length into the header. Four bytes.
	const OSC_PACKET_LENGTH_BYTES = 4;


	// This function is originally from https://github.com/colinbdclark/osc.js
	// Redefined and slightly altered to allow it to be monkey patched to support OSC 1.0 packets.
	let decodeOSC = function (data, packetInfo) {
		data = OSC10.byteArray(data);
		this.emit("raw", data, packetInfo);

		try {
			let packets = OSC10.readPacket(data, this.options);
			for (var i=0; i<packets.length; i++) {
				this.emit("osc", packets[i], packetInfo);
				OSC10.firePacketEvents(this, packets[i], undefined, packetInfo);
			}
		} catch (err) {
			this.emit("error", err);
		}
	};


	// This function is originally from https://github.com/colinbdclark/osc.js
	// Redefined and slightly altered to allow it to be monkey patched to support OSC 1.0 packets.
	OSC10.SLIPPort = function (options) {
		var that = this;
		var o = this.options = options || {};
		o.useSLIP = o.useSLIP === undefined ? true : o.useSLIP;

		this.decoder = new slip.Decoder({
			// Bind to our own decoderOSC
			onMessage: decodeOSC.bind(this),
			onError: function (err) {
				that.emit("error", err);
			}
		});

		// Bind to our own decoderOSC
		var decodeHandler = o.useSLIP ? this.decodeSLIPData : decodeOSC;
		this.on("data", decodeHandler.bind(this));
	};


	if (OSC10.originalReadPacket === undefined) {
		// Pointer to the real osc.readPacket function.
		OSC10.originalReadPacket = OSC10.readPacket;
	}

	/**
	 * Monkey patched to support reading OSC 1.0 packets.
	 * Reads an OSC packet, which may consist of either a bundle or a message.
	 *
	 * @param {Array-like} data an array of bytes to read from
	 * @param {Object} [options] read options
	 * @return {Array} an array of bundles or message objects
	 */
	OSC10.readPacket = function (data, options, offsetState, len) {

		if (options.useSLIP === false) {
			// The first four bytes of an OSC 1.0 packet contain the length of the packet itself.
			// Node may have merged multiple packets into one data object. Separate them into their individual packets.

			let packetResponses = [];
			let currentPos = 0;

			while (currentPos < data.length) {

				// Calculate the payload length from the first four bytes of the packet.
				let payloadLength = 0;
				payloadLength += (payloadLength * 256) + data[currentPos + 0];
				payloadLength += (payloadLength * 256) + data[currentPos + 1];
				payloadLength += (payloadLength * 256) + data[currentPos + 2];
				payloadLength += (payloadLength * 256) + data[currentPos + 3];

				if (payloadLength <= 0) {
					break;
				}

				let payloadStart = currentPos + OSC_PACKET_LENGTH_BYTES;
				let payloadEnd   = payloadStart + payloadLength;

				packetResponses.push(OSC10.originalReadPacket(data.slice(payloadStart, payloadEnd), options, undefined, undefined));
				currentPos = payloadEnd;

			}

			return packetResponses;

		} else {
			// Pass the data to the real osc.readPacket function.
			return [ OSC10.originalPacketRedirected(data, options, offsetState, len) ];
		}

	};




	let oscTcp = new OSC10.TCPSocketPort({
		address  : address,
		port     : port,
		useSLIP  : false,
		metadata : true,
	});


	// This function is originally from https://github.com/colinbdclark/osc.js
	// Redefined and slightly altered to allow it to be monkey patched to support OSC 1.0 packets.
	oscTcp.encodeOSC = function (packet) {
		packet = packet.buffer ? packet.buffer : packet;
		var framed;

		try {
			var encoded = OSC10.writePacket(packet, this.options);

			if (this.options.useSLIP) {
				framed = slip.encode(encoded);
			} else {

				let oscPacket = new Uint8Array(OSC_PACKET_LENGTH_BYTES + encoded.length);
				// Encode the length of the payload in the first 4 bytes of the packet.
				oscPacket[0] = (encoded.length & (255)) >> 8;
				oscPacket[1] = (encoded.length & (255)) >> 16;
				oscPacket[2] = (encoded.length & (255)) >> 24;
				oscPacket[3] = (encoded.length & (255)) >> 32;
				
				for (let i=0; i<encoded.length; i++) {
					oscPacket[OSC_PACKET_LENGTH_BYTES + i] = encoded[i];
				}

				return oscPacket;

			}
		} catch (err) {
			this.emit("error", err);
		}

		return framed;
	};

	// Return the OSC 1.0 TCP connection.
	return oscTcp;

}


/**
 * Sets the listeners on the self.oscSocket object.
 * 
 * Only needs to be done once, even if the socket reconnects.
 */
instance.prototype.setOscSocketListeners = function() {
	let self = this;

	self.oscSocket.on('error', function (err) {
		if (self.instanceState['connected'] === true) {
			// Only show errors if we're connected, otherwise we'll flood the debug log each time
			//  the module tries to reconnect to the console.
			self.log('debug', `Error: ${err.message}`);
		}
	});

	const cueActive      = /^\/eos\/out\/active\/cue\/([\d\.]+)\/([\d\.]+)$/;
	const cueActiveText  = '/eos/out/active/cue/text';
	const cuePending     = /^\/eos\/out\/pending\/cue\/([\d\.]+)\/([\d\.]+)$/;
	const cuePendingText = '/eos/out/pending/cue/text';
	const showName       = '/eos/out/show/name';
	const showLoaded     = '/eos/out/event/show/loaded';
	const showCleared    = '/eos/out/event/show/cleared';
	const softkey        = /^\/eos\/out\/softkey\/(\d+)$/;
	const cmd            = /^\/eos\/out\/user\/(\d+)\/cmd$/;

	self.oscSocket.on('message', function (message) {

		if (self.debugToLogger) {
			self.log('debug', `Eos OSC message args: ${JSON.stringify(message.args)}`);
			self.log('debug', `Eos OSC message: ${message.address}`);
		}

		let matches;

		if (matches = message.address.match(cueActive)) {
			self.setInstanceState('cue_active_list', matches[1], true);
			self.setInstanceState('cue_active_num', matches[2], true);
			self.checkFeedbacks('active_cue');
		}

		if (message.address === cueActiveText) {
			self.parseCueName('active', message.args[0].value);
		}

		if (matches = message.address.match(cuePending)) {
			self.setInstanceState('cue_pending_list', matches[1], true);
			self.setInstanceState('cue_pending_num', matches[2], true);
			self.checkFeedbacks('pending_cue');
		}

		if (message.address === cuePendingText) {
			self.parseCueName('pending', message.args[0].value);
		}

		if (message.address === showName && message.args.length === 1 && message.args[0].type === 's') {
			self.setInstanceState('show_name', message.args[0].value, true);
		}

		if (message.address === showLoaded || message.address === showCleared) {
			// Reset the state when a show is loaded or a new show is created.
			self.requestFullState();
		}

		if ((matches = message.address.match(softkey)) && message.args.length === 1 && message.args[0].type === 's') {
			self.setInstanceState(`softkey_label_${matches[1]}`, message.args[0].value, true);
		}

		if (matches = message.address.match(cmd)) {
			let user_id = matches[1];
			if (user_id === self.config.user_id || self.config.user_id === '-1') {
				self.setInstanceState('cmd', message.args[0].value, true);
			}
		}

	});

	self.oscSocket.open();

	self.oscSocket.socket.on('close', function(error) {
		self.setConnectionState(false);
	});

	self.oscSocket.socket.on('connect', function() {
		self.setConnectionState(true);
		self.requestFullState();
	});

	// self.oscSocket.socket.on('ready', function() { });

}


/**
 * Empties the state (variables/feedbacks) and requests the current state from the console.
 */
instance.prototype.requestFullState = function() {
	let self = this;

	self.emptyState();

	// Request the current state of the console.
	self.sendOsc('/eos/reset', [], false);

	// Switch to the correct user_id.
	self.sendOsc(`/eos/user=${self.config.user_id}`, [], false);

}


/**
 * Empties the state (variables/feedbacks).
 */
instance.prototype.emptyState = function() {
	let self = this;

	// Empty the state, but preserve the connected state.
	self.instanceState = {
		'connected' : self.instanceState['connected'],
	};

	self.checkFeedbacks('pending_cue');
	self.checkFeedbacks('active_cue');
	self.checkFeedbacks('connected');
	self.defineDynamicVariables();

}


/**
 * Parses a cue's name (and the additional information within it) and updates the internal state.
 */
instance.prototype.parseCueName = function(type, cueName) {
	let self = this;

	// Cue name will look something like:
	//  51.1 Drums 3.0 100%
	//  <CUE NUMBER> <LABEL> <DURATION> [<INTENSITY PERCENTAGE>]
	let matches = cueName.match(/^([\d\.]+) (.*?) ([\d\.]+)( ([\d\.]+%))?$/);

	if (matches !== null && matches.length >= 3) {
		// Parse the response.
		self.setInstanceState(`cue_${type}_label`, matches[2], true);
		self.setInstanceState(`cue_${type}_duration`, matches[3], true);

		if (matches.length === 6) {
			self.setInstanceState(`cue_${type}_intensity`, matches[5], true);
		}

	} else {
		// Use as-is. Couldn't parse properly.
		self.setInstanceState(`cue_${type}_label`, cueName, true);
	}

}


/**
 * Return config fields for the module.
 */
instance.prototype.config_fields = function() {

	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 8,
			regex: this.REGEX_IP,
		},
		{
			type: 'textinput',
			id: 'user_id',
			label: 'User ID',
			default: 1,
			width: 4,
			regex: '/^(-1|0|\\d+)$/',
		}
	];

}


/**
 * Initializes the available actions.
 */
instance.prototype.actions = function(system) {
	let self = this;

	self.setActions({
		'custom_cmd': {
			label: 'Custom Command',
			options: [
				{
					type: 'dropdown',
					label: 'Before',
					id: 'before',
					default: 'clear',
					tooltip: 'Clear or keep any existing command.',
					choices: [
						{ id:'clear', label:'Clear command line' },
						{ id:'keep', label:'Keep command line' },
					],
				},
				{
					type: 'textinput',
					label: 'Command',
					tooltip: 'The command to run.',
					id: 'cmd',
				},
				{
					type: 'dropdown',
					label: 'After',
					id: 'after',
					default: 'run',
					tooltip: 'Add the command to the command line or run it.',
					choices: [
						{ id:'add', label:'Add to command line' },
						{ id:'run', label:'Run this command' },
					],
				}
			]
		},

		'next_cue': {
			label: 'Key: Go',
		},

		'stop_back': {
			label: 'Key: Stop/Back',
		},

		'run_cue': {
			label: 'Run Cue',
			options: [
				{
					type: 'textinput',
					label: 'Cue List',
					id: 'list',
					default: '1',
					regex: self.REGEX_NUMBER,
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'number',
					default: '1',
					regex: self.REGEX_FLOAT_OR_INT,
				}
			]
		},

		'run_macro': {
			label: 'Run Macro',
			options: [
				{
					type: 'textinput',
					label: 'Macro',
					id: 'macro',
					default: '1',
					regex: self.REGEX_NUMBER,
				},
			]
		},

		'channel_intensity': {
			label: 'Channel Intensity',
			options: [
				{
					type: 'textinput',
					label: 'Channel',
					id: 'id',
					default: '1',
					regex: self.REGEX_FLOAT_OR_INT,
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					default: '100',
					tooltip: 'A percentage from 0 to 100, or "out", "full", "min", "max".',
					regex: '/^(\\d+|out|full|min|max)$/',
				}
			]
		},

		'group_intensity': {
			label: 'Group Intensity',
			options: [
				{
					type: 'textinput',
					label: 'Group',
					id: 'id',
					default: '1',
					regex: self.REGEX_FLOAT_OR_INT,
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					default: '100',
					tooltip: 'A percentage from 0 to 100, or "out", "full", "min", "max".',
					regex: '/^(\\d+|out|full|min|max)$/',
				}
			]
		},

		'sub_intensity': {
			label: 'Submaster Intensity',
			options: [
				{
					type: 'textinput',
					label: 'Submaster',
					id: 'id',
					default: '1',
					regex: self.REGEX_NUMBER
				},
				{
					type: 'textinput',
					label: 'Value',
					id: 'value',
					default: '100',
					tooltip: 'A percentage from 0 to 100, or "out", "full", "min", "max".',
					regex: '/^(\\d+|out|full|min|max)$/'
				}
			]
		},

		'sub_bump': {
			label: 'Submaster Bump',
			options: [
				{
					type: 'textinput',
					label: 'Submaster',
					id: 'sub',
					default: '1',
					regex: self.REGEX_NUMBER
				},
				{
					type: 'dropdown',
					label: 'State',
					id: 'button',
					default: 'press',
					tooltip: 'A percentage from 0 to 100',
					choices: [
						{ id:'press', label:'Press and Release' },
						{ id:'hold', label:'Press and Hold' },
						{ id:'release', label:'Release' },
					]
				}
			]
		},

	});

}


/**
 * An action is triggered.
 * 
 * @param action        The action being executed
 */
instance.prototype.action = function(action) {
	let self = this;
	let opt = action.options;
	let arg = [];

	switch (action.action) {
		case 'run_cue':
			self.sendOsc(`cue/${opt.list}/${opt.number}/fire`, []);
			break;


		case 'next_cue':
			self.sendOsc(`key/go_0`, [ { type: 'f', value: 1.0 } ]);
			break;


		case 'stop_back':
			self.sendOsc(`key/stop`, [ { type: 'f', value: 1.0 } ]);
			break;


		case 'run_macro':
			self.sendOsc('macro/fire', [ { type: 'i', value: opt.macro } ]);
			break;


		case 'channel_intensity':
		case 'group_intensity':
		case 'sub_intensity':
			let prefix, suffix = '';

			switch (action.action) {
				case 'channel_intensity':
					prefix = 'chan';
					break;

				case 'group_intensity':
					prefix = 'group';
					break;

				case 'sub_intensity':
					prefix = 'sub';
					break;

			}

			if (opt.value.match(/^\d+$/) !== null) {
				// Numeric value as a percentage
				if (action.action === 'sub_intensity') {
					// Value must be a float from 0.0 to 1.0 for subs.
					arg = [ { type: 'f', value: Math.min(100, parseFloat(opt.value)) / 100.0 } ];
				} else {
					// Value must be an int from 1 to 100 for chans/groups.
					arg = [ { type: 'f', value: Math.min(100, parseInt(opt.value)) } ];
				}
			} else {
				// A special command, like "min", "max", "out", "full. Append to command.
				suffix = `/${opt.value}`;
			}

			self.sendOsc(`${prefix}/${opt.id}${suffix}`, arg);
			break;


		case 'sub_bump':
			switch (opt.button) {
				// case 'press': no arg needed

				case 'hold':
					arg = { type: 'f', value: 1.0 };
					break;
				
				case 'release':
					arg = { type: 'f', value: 0.0 };
					break;
			}

			self.sendOsc(`sub/${opt.sub}/fire`, arg);
			break;


		case 'custom_cmd':
			let before = opt.before === 'clear' ? 'newcmd' : 'cmd';
			let cmd    = opt.cmd || '';
			let after  = opt.after === 'add' ? '' : '#';

			self.sendOsc(`${before}`, [
				{ type: 's', value: `${cmd}${after}`}
			]);
			break;

	}

}


/**
 * Sends the path to the OSC host.
 * 
 * @param path          The OSC path to send
 * @param args          An array of arguments, or empty if no arguments needed
 * @param appendUser    Whether to append the '/eos/user/' prefix to the command.
 */
instance.prototype.sendOsc = function(path, args, appendPrefix) {
	let self = this;

	if (!self.config.host) {
		return;
	}

	if (appendPrefix !== false) {
		path = `/eos/${path}`;
	}

	let packet = {
		address : path,
		args    : args,
	};

	if (self.debugToLogger) {
		self.log('warn', `Eos: Sending packet: ${JSON.stringify(packet)}`)
	}

	self.oscSocket.send(packet);

}



instance_skel.extendedBy(instance);
exports = module.exports = instance;
