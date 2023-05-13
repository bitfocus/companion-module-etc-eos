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
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				let before = opt.before === 'clear' ? 'newcmd' : 'cmd'
				let cmd    = opt.cmd || ''
				let after  = opt.after === 'add' ? '' : '#'

				self.sendOsc(`${before}`, [
					{ type: 's', value: `${cmd}${after}`}
				])
			},
		},
		custom_osc: {
			name: 'Custom Command (OSC)',
			options: [
				{
					id: 'osc_path',
					type: 'textwithvariables',
					name: 'OSC path',
					default: '',
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc(opt.osc_path, [], false)
			},
		},
		blackout: {
			name: 'Key: Blackout',
			options: [],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc('key/blackout', [ ])
			},
		},
		next_cue: {
			name: 'Key: Go',
			options: [],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc(`key/go_0`, [ { type: 'f', value: 1.0 } ])
			},
		},
		stop_back: {
			name: 'Key: Stop/Back',
			options: [],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc(`key/stop`, [ { type: 'f', value: 1.0 } ])
			},
		},
		run_cue: {
			name: 'Key: Run Cue',
			options: [
				{
					id: 'list',
					type: 'textwithvariables',
					name: 'Cue List',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
				{
					id: 'number',
					type: 'textwithvariables',
					name: 'Cue Number',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc(`cue/${options.list}/${options.number}/fire`, [])
			},
		},
		run_macro: {
			name: 'Key: Run Macro',
			options: [
				{
					id: 'macro',
					type: 'textwithvariables',
					name: 'Macro',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc('macro/fire', [ { type: 'i', value: opt.macro } ])
			},
		},
		press_key: {
			name: 'Key: Press Key',
			options: [
				{
					id: 'key',
					type: 'textwithvariables',
					name: 'Key',
					tooltip: "See the module's help for information",
					default: '1',
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc('key/' + opt.key, [ ])
			},
		},
		channel_intensity: {
			name: 'Channel Intensity',
			options: [
				{
					id: 'id',
					type: 'textwithvariables',
					name: 'Channel',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
				{
					id: 'value',
					type: 'textwithvariables',
					name: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				setIntensity( 'chan', opt )
			},
		},
		group_intensity: {
			name: 'Group Intensity',
			options: [
				{
					id: 'id',
					type: 'textwithvariables',
					name: 'Group',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
				{
					id: 'value',
					type: 'textwithvariables',
					name: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				setIntensity( 'group', opt )
			},
		},
		sub_intensity: {
			name: 'Submaster Intensity',
			options: [
				{
					id: 'id',
					type: 'textwithvariables',
					name: 'Submaster',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
				{
					id: 'value',
					type: 'textwithvariables',
					name: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				setIntensity( 'sub', opt )
			},
		},
		sub_bump: {
			name: 'Submaster Bump',
			options: [
				{
					id: 'sub',
					type: 'textwithvariables',
					name: 'Submaster',
					default: '1',
					regex: this.REGEX_NUMBER,
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
				let opt = this.parseOptions( event.options )
				switch (opt.button) {
					// case 'press': no arg needed
					case 'hold':
						arg = { type: 'f', value: 1.0 }
						break;				
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
					type: 'textwithvariables',
					name: 'Preset',
					default: '1',
					regex: this.REGEX_NUMBER
				},
			],
			callback: async (event) => {
				let opt = this.parseOptions( event.options )
				self.sendOsc(`preset/${opt.preset}/fire`, [])
			},
		},
	})
}
