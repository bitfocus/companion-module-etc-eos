const { combineRgb } = require('@companion-module/base')

module.exports = async function (self) {
	self.setFeedbackDefinitions({
		pending_cue: {
			name: 'When cue is pending',
			description: "Changes the button's style when this cue is pending.",
			options: [
				{
					id: 'bg',
					type: 'colorpicker',
					label: 'Background Color',
					default: combineRgb(204,102,0),
				},
				{
					id: 'fg',
					type: 'colorpicker',
					label: 'Foreground Color',
					default: combineRgb(255,255,255),
				},
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue List',
					default: '1',
					regex: this.REGEX_NUMBER,
				},
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue Number',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
			],
			callback: (feedback) => {
				if (feedback.options.list === self.instanceState['cue_pending_list'] &&
						feedback.options.number === self.instanceState['cue_pending_num']) {

					return {
						color   : feedback.options.fg,
						bgcolor : feedback.options.bg,
					}
				}
			},
		},
		active_cue: {
			name: 'When cue is active',
			description: "Changes the button's style when this cue is active.",
			options: [
				{
					id: 'bg',
					type: 'colorpicker',
					label: 'Background Color',
					default: combineRgb(51,102,0),
				},
				{
					id: 'fg',
					type: 'colorpicker',
					label: 'Foreground Color',
					default: combineRgb(255,255,255),
				},
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue List',
					default: '1',
					regex: this.REGEX_NUMBER,
				},
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue Number',
					default: '1',
					regex: this.REGEX_FLOAT_OR_INT,
				},
			],
			callback: (feedback) => {
				if (feedback.options.list === self.instanceState['cue_active_list'] &&
						feedback.options.number === self.instanceState['cue_active_num']) {

					return {
						color   : feedback.options.fg,
						bgcolor : feedback.options.bg,
					}
				}
			},
		},
		conneccted: {
			name: 'When connection to console changes',
			description: 'Changes colors when the connection state to the console changes.',
			options: [
				{
					id: 'bg',
					type: 'colorpicker',
					label: 'Background Color',
					default: combineRgb(51,102,0),
				},
				{
					id: 'fg',
					type: 'colorpicker',
					label: 'Foreground Color',
					default: combineRgb(255,255,255),
				},
				{
					id: 'connected',
					type: 'checkbox',
					label: 'Is connected',
					default: true,
				},
			],
			callback: (feedback) => {
				if (feedback.type === 'connected') {
					// The connection to the console changed.

					if (feedback.options.connected === self.instanceState['connected']) {

						return {
							color   : feedback.options.fg,
							bgcolor : feedback.options.bg,
						}

					}
				}			
			},
		},
	})
}
