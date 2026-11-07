const constants = require('./constants.js')

const GetVariableDefinitions = function (self) {
	const { ParamMap } = require('./param_map')

	let variableDefinitions = [
		{ variableId: 'cue_active_list', name: 'The active cue list number' },
		{ variableId: 'cue_active_num', name: 'The active cue number' },
		{ variableId: 'cue_active_label', name: 'The active cue label' },
		{ variableId: 'cue_active_duration', name: 'The active cue duration in seconds' },
		{ variableId: 'cue_active_intensity', name: 'The active cue intensity percent' },

		{ variableId: 'cue_pending_list', name: 'The pending cue list number' },
		{ variableId: 'cue_pending_num', name: 'The pending cue number' },
		{ variableId: 'cue_pending_label', name: 'The pending cue label' },
		{ variableId: 'cue_pending_duration', name: 'The pending cue duration in seconds' },

		{ variableId: 'cue_previous_list', name: 'The previous cue list number' },
		{ variableId: 'cue_previous_num', name: 'The previous cue number' },
		{ variableId: 'cue_previous_label', name: 'The previous cue label' },
		{ variableId: 'cue_previous_duration', name: 'The previous cue duration in seconds' },

		{ variableId: 'cmd', name: 'The current command line output for the user ' },
		{ variableId: 'show_name', name: 'The name of the show' },

		{ variableId: 'eos_version', name: 'The Eos software version' },
		{ variableId: 'fixture_library_version', name: 'The fixture library version' },
		{ variableId: 'gel_swatch_type', name: 'The gel swatch type' },

		{ variableId: 'hue', name: 'Current hue value' },
		{ variableId: 'saturation', name: 'Current saturation value' },

		{ variableId: 'macro_fired', name: 'Currently firing macro ID' },
		{ variableId: 'last_macro', name: 'Last macro that was fired' },
	]

	/* we can capture these params/attributes from related wheel updates as both string and float */
	/* values. The list of encoders are in param_map.js which is shared by the main logic */
	Object.entries(ParamMap).forEach((entry) => {
		const [label, param] = entry
		variableDefinitions.push({ variableId: `${param}_stringval`, name: `Encoder: ${label} (string)` })
		variableDefinitions.push({ variableId: `${param}_floatval`, name: `Encoder: ${label} (float)` })
	})

	// Encoder Wheels grouped by categories... Up to ${wheelsPerCategory} wheels per category, 7 categories, 0-6
	for (let i = 0; i <= 6; i++) {
		variableDefinitions.push({ variableId: `cat${i}_wheel_count`, name: `Count of encoders in category ${i}` })

		for (let j = 1; j <= self.wheelsPerCategory; j++) {
			variableDefinitions.push({
				variableId: `cat${i}_wheel_${j}_label`,
				name: `Encoders category ${i} Wheel ${j} Label`,
			})
			variableDefinitions.push({
				variableId: `cat${i}_wheel_${j}_stringval`,
				name: `Encoders category ${i} Wheel ${j} String Value`,
			})
			variableDefinitions.push({
				variableId: `cat${i}_wheel_${j}_floatval`,
				name: `Encoders category ${i} Wheel ${j} Float Value`,
			})
			variableDefinitions.push({
				variableId: `cat${i}_wheel_${j}_oscname`,
				name: `Encoders category ${i} Wheel ${j} param name`,
			})
		}
	}

	// There are 6 soft keys, and 6 alternates (exposed with {More SK}).
	for (let i = 1; i <= constants.NUM_SOFTKEYS; i++) {
		variableDefinitions.push({ variableId: `softkey_label_${i}`, name: `Soft key ${i}'s label` })
	}

	// Group, preset and macro labels: only for targets that exist in the show (read by index from the console)
	for (const type of constants.LABEL_NAMES) {
		for (const num of self.labelDefinedNumbers?.[type] || []) {
			const id = String(num).replace(/\./g, '_')
			variableDefinitions.push({ variableId: `${type}_label_${id}`, name: `${type} ${num}'s label` })
		}
	}

	// Cues of the configured cue list, by position (cue_index_X_*) and by cue number (cue_N_label).
	const cueList = typeof self.getCueListToPoll === 'function' ? self.getCueListToPoll() : constants.DEFAULT_CUE_LIST
	const numCues = typeof self.getNumCuesToPoll === 'function' ? self.getNumCuesToPoll() : constants.DEFAULT_NUM_CUES
	if (cueList > 0 && numCues > 0) {
		variableDefinitions.push({ variableId: 'cue_list_count', name: `Number of cues in cue list ${cueList}` })
		for (let i = 1; i <= numCues; i++) {
			variableDefinitions.push({ variableId: `cue_index_${i}_num`, name: `Cue list ${cueList}: cue number at position ${i}` })
			variableDefinitions.push({ variableId: `cue_index_${i}_label`, name: `Cue list ${cueList}: cue label at position ${i}` })
		}
		for (const cueNumber of self.cueListDefinedNumbers || []) {
			const id = String(cueNumber).replace(/\./g, '_')
			variableDefinitions.push({ variableId: `cue_${id}_label`, name: `Cue ${cueList}/${cueNumber} label` })
		}
	}

	return variableDefinitions
}

const UpdateVariableDefinitions = function (self) {
	let variableDefinitions = GetVariableDefinitions(self)

	self.setVariableDefinitions(variableDefinitions)

	const variableValues = {}
	// Initialize the default values for the variables
	for (let i = 0; i < variableDefinitions.length; i++) {
		variableValues[variableDefinitions[i].variableId] = ''
	}
	self.setVariableValues(variableValues)
}

module.exports = { GetVariableDefinitions, UpdateVariableDefinitions }