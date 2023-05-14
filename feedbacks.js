const { combineRgb } = require('@companion-module/base')

module.exports = function (self) {
	self.setFeedbackDefinitions({
		pending_cue: {
			type: 'boolean',
			name: 'When cue is pending',
			description: "Changes the button's style when this cue is pending.",
			defaultStyle: {
				bgcolor: combineRgb(204, 102, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue List',
					default: '1',
					regex: Regex.NUMBER,
				},
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue Number',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
				},
			],
			callback: (feedback) => {
				return (
					feedback.options.list === self.instanceState['cue_pending_list'] &&
					feedback.options.number === self.instanceState['cue_pending_num']
				)
			},
		},
		active_cue: {
			type: 'boolean',
			name: 'When cue is active',
			description: "Changes the button's style when this cue is active.",
			defaultStyle: {
				bgcolor: combineRgb(51, 102, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue List',
					default: '1',
					regex: Regex.NUMBER,
				},
				{
					id: 'list',
					type: 'textinput',
					label: 'Cue Number',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
				},
			],
			callback: (feedback) => {
				return (
					feedback.options.list === self.instanceState['cue_active_list'] &&
					feedback.options.number === self.instanceState['cue_active_num']
				)
			},
		},
		connected: {
			type: 'boolean',
			name: 'When connection to console changes',
			description: 'Changes colors when the connection state to the console changes.',
			defaultStyle: {
				bgcolor: combineRgb(51, 102, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'connected',
					type: 'checkbox',
					label: 'Is connected',
					default: true,
				},
			],
			callback: (feedback) => {
				return feedback.options.connected === self.instanceState['connected']
			},
		},
	})
}
