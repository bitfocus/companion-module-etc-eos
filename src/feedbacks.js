const { combineRgb, Regex } = require('@companion-module/base')
const constants = require('./constants.js')

module.exports = function (self) {
	let feedbacks = {
		macroisfired: {
			type: 'boolean',
			name: 'When macro is firing',
			description: "Changes the button's style while this macro is fired.",
			defaultStyle: {
				bgcolor: combineRgb(255, 0, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'number',
					type: 'textinput',
					label: 'Macro ID',
					default: '1',
					regex: Regex.INT,
				},
			],
			callback: (feedback) => {
				return (
					feedback.options.number === self.instanceState['macro_fired']
				)
			},
		},
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
					id: 'number',
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
					id: 'number',
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
		previous_cue: {
			type: 'boolean',
			name: 'When cue is the previous cue',
			description: "Changes the button's style when this cue is previous.",
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
					id: 'number',
					type: 'textinput',
					label: 'Cue Number',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
				},
			],
			callback: (feedback) => {
				return (
					feedback.options.list === self.instanceState['cue_previous_list'] &&
					feedback.options.number === self.instanceState['cue_previous_num']
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
	};

	for (const item_type of constants.LABEL_NAMES) {
		const item_name = constants.ITEM_NAMES[item_type];
		feedbacks[`${item_type}_label`] = {
			type: 'value',
			name: `${item_name} Label`,
			description: `The Label of a numbered ${item_name}.`,
			options: [{
				id: 'number',
				type: 'textinput',
				label: `${item_name} Number`,
				default: '1',
				regex: Regex.FLOAT_OR_INT,
			}],
			callback: (feedback) => {
				let sync = self.sync;
				self.log(
					'debug',
					`Eos: Feedback: ${item_name} callback called ${feedback.options.number} ${feedback.id}`
				)
				let v = sync.get_item_value(item_type, feedback.options.number, feedback.id);
				self.log('debug', `Eos: Feedback: ${item_name} got value ${feedback.options.number} ${feedback.id} ${v}`)
				return v;
			},
			unsubscribe: (feedback) => {
				let sync = self.sync;
				self.log(
					'debug',
					`Eos: Feedback: ${item_name} callback unsubscribed ${feedback.options.number} ${feedback.id}`
				)
				sync.remove_item_subscription(item_type, feedback.options.number, feedback.id);
			},
		};
	}

	self.setFeedbackDefinitions(feedbacks);
}