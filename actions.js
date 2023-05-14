const { Regex } = require('@companion-module/base')

module.exports = function (self) {
	self.setActionDefinitions({
		custom_cmd: {
			name: 'Custom Command',
			options: [
				{
					id: 'before',
					type: 'dropdown',
					name: 'Before',
					default: 'clear',
					tooltip: 'Clear or keep any existing command.',
					choices: [
						{ id: 'clear', name: 'Clear command line' },
						{ id: 'keep', name: 'Keep command line' },
					],
				},
				{
					type: 'textinput',
					label: 'Command',
					tooltip: 'The command to run.',
					id: 'cmd',
					useVariables: true,
				},
				{
					type: 'dropdown',
					label: 'After',
					id: 'after',
					default: 'run',
					tooltip: 'Add the command to the command line or run it.',
					choices: [
						{ id: 'add', label: 'Add to command line' },
						{ id: 'run', label: 'Run this command' },
					],
				},
			],
			callback: async (event) => {
				let opt = '',
					before = '',
					cmd = '',
					after = ''
				opt = self.parseOptions(event.options)
				before = opt.before === 'clear' ? 'newcmd' : 'cmd'
				cmd = opt.cmd || ''
				after = opt.after === 'add' ? '' : '#'

				self.sendOsc(`${before}`, [{ type: 's', value: `${cmd}${after}` }])
			},
		},
		custom_osc: {
			name: 'Custom Command (OSC)',
			options: [
				{
					id: 'osc_path',
					type: 'textinput',
					name: 'OSC path',
					default: '',
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc(opt.osc_path, [], false)
			},
		},
		blackout: {
			name: 'Key: Blackout',
			options: [],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc('key/blackout', [])
			},
		},
		next_cue: {
			name: 'Key: Go',
			options: [],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc(`key/go_0`, [{ type: 'f', value: 1.0 }])
			},
		},
		stop_back: {
			name: 'Key: Stop/Back',
			options: [],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc(`key/stop`, [{ type: 'f', value: 1.0 }])
			},
		},
		run_cue: {
			name: 'Key: Run Cue',
			options: [
				{
					id: 'list',
					type: 'textinput',
					name: 'Cue List',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'number',
					type: 'textinput',
					name: 'Cue Number',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc(`cue/${options.list}/${options.number}/fire`, [])
			},
		},
		run_macro: {
			name: 'Key: Run Macro',
			options: [
				{
					id: 'macro',
					type: 'textinput',
					name: 'Macro',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc('macro/fire', [{ type: 'i', value: opt.macro }])
			},
		},
		press_key: {
			name: 'Key: Press Key',
			options: [
				{
					id: 'key',
					type: 'textinput',
					name: 'Key',
					tooltip: "See the module's help for information",
					default: '1',
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc('key/' + opt.key, [])
			},
		},
		channel_intensity: {
			name: 'Channel Intensity',
			options: [
				{
					id: 'id',
					type: 'textinput',
					name: 'Channel',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					name: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				setIntensity('chan', opt)
			},
		},
		group_intensity: {
			name: 'Group Intensity',
			options: [
				{
					id: 'id',
					type: 'textinput',
					name: 'Group',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					name: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				setIntensity('group', opt)
			},
		},
		sub_intensity: {
			name: 'Submaster Intensity',
			options: [
				{
					id: 'id',
					type: 'textinput',
					name: 'Submaster',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					name: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				setIntensity('sub', opt)
			},
		},
		sub_bump: {
			name: 'Submaster Bump',
			options: [
				{
					id: 'sub',
					type: 'textinput',
					name: 'Submaster',
					default: '1',
					regex: Regex.NUMBER,
					useVariables: true,
				},
				{
					id: 'button',
					type: 'dropdown',
					name: 'State',
					default: 'press',
					tooltip: 'A percentage from 0 to 100',
					choices: [
						{ id: 'press', name: 'Press and Release' },
						{ id: 'hold', name: 'Press and Hold' },
						{ id: 'release', name: 'Release' },
					],
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				switch (opt.button) {
					// case 'press': no arg needed
					case 'hold':
						arg = { type: 'f', value: 1.0 }
						break
					case 'release':
						arg = { type: 'f', value: 0.0 }
						break
				}
				self.sendOsc(`sub/${opt.sub}/fire`, arg)
			},
		},
		fire_preset: {
			name: 'Fire Preset',
			options: [
				{
					id: 'preset',
					type: 'textinput',
					name: 'Preset',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
			],
			callback: async (event) => {
				let opt = ''
				opt = self.parseOptions(event.options)
				self.sendOsc(`preset/${opt.preset}/fire`, [])
			},
		},
	})
}
