const GetVariableDefinitions = function(self) {

	const { ParamMap } = require('./param_map')

	let variableDefinitions = [
		{ variableId: 'cue_active_list',			name: 'The active cue list number' },
		{ variableId: 'cue_active_num',				name: 'The active cue number' },
		{ variableId: 'cue_active_label',			name: 'The active cue label' },
		{ variableId: 'cue_active_duration',		name: 'The active cue duration in seconds' },
		{ variableId: 'cue_active_intensity',		name: 'The active cue intensity percent' },

		{ variableId: 'cue_pending_list',			name: 'The pending cue list number' },
		{ variableId: 'cue_pending_num',			name: 'The pending cue number' },
		{ variableId: 'cue_pending_label',			name: 'The pending cue label' },
		{ variableId: 'cue_pending_duration',		name: 'The pending cue duration in seconds' },

		{ variableId: 'cmd',						name: 'The current command line output for the user ' },
		{ variableId: 'show_name',					name: 'The name of the show' },

		{ variableId: 'cue_pending',				name: 'The pending cue ' },		
	]

	/* we can capture these params/attributes from related wheel updates as both string and float */
	/* values. The list of encoders are in param_map.js which is shared by the main logic */
	Object.entries(ParamMap).forEach(entry => {
		const [label, param] = entry
		variableDefinitions.push({ variableId: `${param}_stringval`, name: `Encoder: ${label} (string)` })
		variableDefinitions.push({ variableId: `${param}_floatval`, name: `Encoder: ${label} (float)` })
	})

	// This approach lets us capture any/all wheel data, but the downside is that you have to figure
	// out what wheel number you need. :( I couldn't find a list of how many there were, lets go for 50.
	// I believe each fixture definition has their own set.
	for (let i = 1; i <= 50; i++) {
		variableDefinitions.push({ variableId: `wheel_label_${i}`, name: `Wheel ${i}'s label` })
		variableDefinitions.push({ variableId: `wheel_stringval_${i}`, name: `Wheel ${i}'s string value` })
		variableDefinitions.push({ variableId: `wheel_cat_${i}`, name: `Wheel ${i}'s category` })
		variableDefinitions.push({ variableId: `wheel_floatval_${i}`, name: `Wheel ${i}'s float value` })
	}

	// There are 6 soft keys, and 6 alternates (exposed with {More SK}).
	for (let i = 1; i <= 12; i++) {
		variableDefinitions.push({ variableId: `softkey_label_${i}`, name: `Soft key ${i}'s label` })
	}
	return variableDefinitions;
}

const UpdateVariableDefinitions = function(self) {
	let variableDefinitions = GetVariableDefinitions(this)

	self.setVariableDefinitions( variableDefinitions )

	const variableValues = {}
	// Initialize the default values for the variables
	for (let i = 0; i < variableDefinitions.length; i++) {
		variableValues[variableDefinitions[i].variableId] = ''
	}
	self.setVariableValues(variableValues)
}

module.exports = { GetVariableDefinitions, UpdateVariableDefinitions }
