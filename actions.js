const { Regex } = require('@companion-module/base')

module.exports = function (self) {
	self.setActionDefinitions({
		custom_cmd: {
			name: 'Custom Command',
			options: [
				{
					id: 'before',
					type: 'dropdown',
					label: 'Before',
					default: 'clear',
					tooltip: 'Clear or keep any existing command.',
					choices: [
						{ id: 'clear', label: 'Clear command line' },
						{ id: 'keep', label: 'Keep command line' },
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
			callback: async (event, context) => {
				const before = event.options.before === 'clear' ? 'newcmd' : 'cmd'
				const cmd = await context.parseVariablesInString(event.options.cmd || '')
				const after = event.options.after === 'add' ? '' : '#'

				self.sendOsc(`${before}`, [{ type: 's', value: `${cmd}${after}` }])
			},
		},
		custom_osc: {
			name: 'Custom Command (OSC)',
			options: [
				{
					id: 'osc_path',
					type: 'textinput',
					label: 'OSC path',
					default: '/eos/path',
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const osc_path = await context.parseVariablesInString(event.options.osc_path || '')
				self.sendOsc(osc_path, [], false)
			},
		},
		// Modeled From: companion-module-generic-osc
		// https://github.com/bitfocus/companion-module-generic-osc/blob/master/osc.js
		// Copyright (c) 2018 Bitfocus AS, William Viker & Håkon Nessjøen
		// Per MIT license
		// Slightly tweaked
		send_multiple: {
			name: 'Custom Command (OSC) with args',
			options: [
				{
					type: 'textinput',
					label: 'OSC Path',
					id: 'osc_path',
					default: '/eos/path',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Arguments',
					id: 'osc_args',
					default: '1 "test" 2.5',
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const osc_path = await context.parseVariablesInString(event.options.osc_path)
				const osc_argsStr = await context.parseVariablesInString(event.options.osc_args)
				const rawArgs = (osc_argsStr + '').replace(/“/g, '"').replace(/”/g, '"').split(' ')

				if (rawArgs.length) {
					const args = []
					for (let i = 0; i < rawArgs.length; i++) {
						if (rawArgs[i].length == 0) continue
						if (isNaN(rawArgs[i])) {
							let str = rawArgs[i]
							if (str.startsWith('"')) {
								//a quoted string..
								while (!rawArgs[i].endsWith('"')) {
									i++
									str += ' ' + rawArgs[i]
								}
							} else if (str.startsWith('{')) {
								//Probably a JSON object
								try {
									args.push(JSON.parse(rawArgs[i]))
								} catch (error) {
									this.log('error', `not a JSON object ${rawArgs[i]}`)
								}
							}

							args.push({
								type: 's',
								value: str.replace(/"/g, '').replace(/'/g, ''),
							})
						} else if (rawArgs[i].indexOf('.') > -1) {
							args.push({
								type: 'f',
								value: parseFloat(rawArgs[i]),
							})
						} else {
							args.push({
								type: 'i',
								value: parseInt(rawArgs[i]),
							})
						}
					}
					self.sendOsc(osc_path, args, false)
				}
			},
		},
		// End of code borrowed from: companion-module-generic-osc
		blackout: {
			name: 'Key: Blackout',
			options: [],
			callback: async (event, context) => {
				self.sendOsc('key/blackout', [])
			},
		},
		next_cue: {
			name: 'Key: Go',
			options: [],
			callback: async (event, context) => {
				self.sendOsc(`key/go_0`, [{ type: 'f', value: 1.0 }])
			},
		},
		stop_back: {
			name: 'Key: Stop/Back',
			options: [],
			callback: async (event, context) => {
				self.sendOsc(`key/stop`, [{ type: 'f', value: 1.0 }])
			},
		},
		run_cue: {
			name: 'Key: Run Cue',
			options: [
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue List',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'number',
					type: 'textinput',
					label: 'Cue Number',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const list = await context.parseVariablesInString(event.options.list)
				const number = await context.parseVariablesInString(event.options.number)
				self.sendOsc(`cue/${list}/${number}/fire`, [])
			},
		},
		run_macro: {
			name: 'Key: Run Macro',
			options: [
				{
					id: 'macro',
					type: 'textinput',
					label: 'Macro',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const macro = await context.parseVariablesInString(event.options.macro)
				self.sendOsc('macro/fire', [{ type: 'i', value: Number(macro) }])
			},
		},
		press_key: {
			name: 'Key: Press Key',
			options: [
				{
					id: 'key',
					type: 'textinput',
					label: 'Key',
					tooltip: "See the module's help for information",
					default: '1',
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const key = await context.parseVariablesInString(event.options.key)
				self.sendOsc('key/' + key, [])
			},
		},
		channel_intensity: {
			name: 'Channel Intensity',
			options: [
				{
					id: 'id',
					type: 'textinput',
					label: 'Channel',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const id = await context.parseVariablesInString(event.options.id)
				const value = await context.parseVariablesInString(event.options.value)

				self.setIntensity('chan', id, value)
			},
		},
		group_intensity: {
			name: 'Group Intensity',
			options: [
				{
					id: 'id',
					type: 'textinput',
					label: 'Group',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const id = await context.parseVariablesInString(event.options.id)
				const value = await context.parseVariablesInString(event.options.value)

				self.setIntensity('group', id, value)
			},
		},
		sub_intensity: {
			name: 'Submaster Intensity',
			options: [
				{
					id: 'id',
					type: 'textinput',
					label: 'Submaster',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Value',
					tooltip: "A percentage from 0 to 100, or 'out', 'full', 'min', 'max'.",
					default: '100',
					regex: '/^(\\d+|out|full|min|max)$/',
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const id = await context.parseVariablesInString(event.options.id)
				const value = await context.parseVariablesInString(event.options.value)

				self.setIntensity('sub', id, value)
			},
		},
		sub_bump: {
			name: 'Submaster Bump',
			options: [
				{
					id: 'sub',
					type: 'textinput',
					label: 'Submaster',
					default: '1',
					regex: Regex.NUMBER,
					useVariables: true,
				},
				{
					id: 'button',
					type: 'dropdown',
					label: 'State',
					default: 'press',
					choices: [
						{ id: 'press', label: 'Press and Release' },
						{ id: 'hold', label: 'Press and Hold' },
						{ id: 'release', label: 'Release' },
					],
				},
			],
			callback: async (event, context) => {
				const submaster = await context.parseVariablesInString(event.options.sub)

				let arg
				switch (event.options.button) {
					// case 'press': no arg needed
					case 'hold':
						arg = { type: 'f', value: 1.0 }
						break
					case 'release':
						arg = { type: 'f', value: 0.0 }
						break
				}

				self.sendOsc(`sub/${submaster}/fire`, arg)
			},
		},
		fire_preset: {
			name: 'Fire Preset',
			options: [
				{
					id: 'preset',
					type: 'textinput',
					label: 'Preset',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
					useVariables: true,
				},
			],
			callback: async (event, context) => {
				const preset = await context.parseVariablesInString(event.options.preset)

				self.sendOsc(`preset/${preset}/fire`, [])
			},
		},
		softkey: {
			name: 'Softkey',
			options: [
				{
					id: 'key',
					type: 'textinput',
					label: 'Softkey',
					default: '1',
					regex: Regex.NUMBER,
					useVariables: true,
				},
				{
					id: 'button',
					type: 'dropdown',
					label: 'State',
					default: 'press',
					choices: [
						{ id: 'press', label: 'Press and Release' },
						{ id: 'hold', label: 'Press and Hold' },
						{ id: 'release', label: 'Release' },
					],
				},
			],
			callback: async (event, context) => {
				const key = await context.parseVariablesInString(event.options.key)

				let arg
				switch (event.options.button) {
					// case 'press': no arg needed
					case 'hold':
						arg = { type: 'f', value: 1.0 }
						break
					case 'release':
						arg = { type: 'f', value: 0.0 }
						break
				}

				self.sendOsc(`softkey/${key}`, arg)
			},
		},
	})
}
