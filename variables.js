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

    // Group Titles '
    for (let i = 1; i <= constants.NUM_GROUP_LABELS; i++) {
        variableDefinitions.push({ variableId: `group_label_${i}`, name: `Group ${i}'s label` })
    }

    // Macro Labels
    for (let i = constants.NUM_MACRO_START; i < constants.NUM_MACRO_START + constants.NUM_MACRO_LABELS; i++) {
        variableDefinitions.push({ variableId: `macro_label_${i}`, name: `Macro ${i}'s label` })
    }

    // '
	return variableDefinitions;
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
