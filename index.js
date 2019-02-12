var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {

	// super-constructor
	instance_skel.apply(this, arguments);

	this.actions();
	return this;

};


/**
 * The module's config was updated.
 */
instance.prototype.updateConfig = function(config) {
	this.config = config;
};


/**
 * Initializes the module and sets its state.
 */
instance.prototype.init = function() {
	this.status(this.STATE_OK);

	debug = this.debug;
	log = this.log;
};


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
			id: 'port',
			label: 'Target Port',
			default: 3032,
			width: 4,
			regex: this.REGEX_PORT,
		},
		{
			type: 'textinput',
			id: 'user_id',
			label: 'User ID',
			default: 1,
			width: 4,
			regex: this.REGEX_NUMBER,
		},
	];

};


/**
 * When module gets deleted.
 */
instance.prototype.destroy = function() {
	debug("destroy");
};


/**
 * Initializes the available actions.
 */
instance.prototype.actions = function(system) {

	this.setActions({
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
					]
				},
				{
					type: 'textinput',
					label: 'Command',
					tooltip: 'The command to run.',
					id: 'cmd'
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
					]
				}
			]
		},

		'next_cue': {
			label: 'Key: Go'
		},

		'stop_back': {
			label: 'Key: Stop/Back'
		},

		'run_cue': {
			label: 'Run Cue',
			options: [
				{
					type: 'textinput',
					label: 'Cue List',
					id: 'list',
					default: '1',
					regex: this.REGEX_NUMBER
				},
				{
					type: 'textinput',
					label: 'Cue Number',
					id: 'number',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT
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
					regex: this.REGEX_NUMBER
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
					regex: this.REGEX_FLOAT_OR_INT
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

		'group_intensity': {
			label: 'Group Intensity',
			options: [
				{
					type: 'textinput',
					label: 'Group',
					id: 'id',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT
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

		'sub_intensity': {
			label: 'Submaster Intensity',
			options: [
				{
					type: 'textinput',
					label: 'Submaster',
					id: 'id',
					default: '1',
					regex: this.REGEX_NUMBER
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
					regex: this.REGEX_NUMBER
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

};


/**
 * An action is triggered.
 * 
 * @param action        The action being executed
 */
instance.prototype.action = function(action) {
	let opt = action.options;
	let arg = [];

	switch (action.action) {
		case 'run_cue':
			this.sendOsc(`cue/${opt.list}/${opt.number}/fire`, []);
			break;


		case 'next_cue':
			this.sendOsc(`key/go_0`, [ { type: 'f', value: 1.0 } ]);
			break;


		case 'stop_back':
			this.sendOsc(`key/stop`, [ { type: 'f', value: 1.0 } ]);
			break;


		case 'run_macro':
			this.sendOsc('macro/fire', [ { type: 'i', value: opt.macro } ]);
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

			this.sendOsc(`${prefix}/${opt.id}${suffix}`, arg);
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

			this.sendOsc(`sub/${opt.sub}/fire`, arg);
			break;


		case 'custom_cmd':
			var before = opt.before === 'clear' ? 'newcmd' : 'cmd';
			var cmd    = opt.cmd || '';
			var after  = opt.after === 'add' ? '' : '#';

			this.sendOsc(`${before}`, [
				{ type: 's', value: `${cmd}${after}`}
			]);
			break;

	}	

};


/**
 * Sends the path to the OSC host.
 * 
 * @param path          The OSC path to send
 * @param args          An array of arguments, or empty if no arguments needed
 */
instance.prototype.sendOsc = function(path, args) {
	path = `/eos/user/${this.config.user_id}/${path}`;
	this.system.emit('osc_send', this.config.host, this.config.port, path, args);	
};


instance_skel.extendedBy(instance);
exports = module.exports = instance;
