const GetVariableDefinitions = function(self) {
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

		{ variableId: 'cmd', name: 'The current command line output for the user ' },
		{ variableId: 'show_name', name: 'The name of the show' },

		{ variableId: 'cue_pending', name: 'The pending cue ' },
		
		/* WIP(?) - if we use variables for known encoder parameters... */
		/* we can capture these from related wheel updates, as string and float */
		{ variableId: 'enc_intensity_stringval', name: 'Encoder: Intensity level (string)' },
		{ variableId: 'enc_intensity_floatval', name: 'Encoder: Intensity level (float)' },
		{ variableId: 'enc_zoom_stringval', name: 'Encoder: Zoom level (string)' },
		{ variableId: 'enc_zoom_floatval', name: 'Encoder: Zoom level (float)' },
		{ variableId: 'enc_edge_stringval', name: 'Encoder: Edge level (string)' },
		{ variableId: 'enc_edge_floatval', name: 'Encoder: Edge level (float)' },
		{ variableId: 'enc_iris_stringval', name: 'Encoder: Iris level (string)' },
		{ variableId: 'enc_iris_floatval', name: 'Encoder: Iris level (float)' },
		{ variableId: 'enc_pan_stringval', name: 'Encoder: Pan level (string)' },
		{ variableId: 'enc_pan_floatval', name: 'Encoder: Pan level (float)' },
		{ variableId: 'enc_tilt_stringval', name: 'Encoder: Tilt level (string)' },
		{ variableId: 'enc_tilt_floatval', name: 'Encoder: Tilt level (float)' },
		{ variableId: 'enc_x_focus_stringval', name: 'Encoder: X Focus level (string)' },
		{ variableId: 'enc_x_focus_floatval', name: 'Encoder: X Focus level (float)' },
		{ variableId: 'enc_y_focus_stringval', name: 'Encoder: Y Focus level (string)' },
		{ variableId: 'enc_y_focus_floatval', name: 'Encoder: Y Focus level (float)' },
		{ variableId: 'enc_z_focus_stringval', name: 'Encoder: Z Focus level (string)' },
		{ variableId: 'enc_z_focus_floatval', name: 'Encoder: Z Focus level (float)' },
		{ variableId: 'enc_red_stringval', name: 'Encoder: Red level (string)' },
		{ variableId: 'enc_red_floatval', name: 'Encoder: Red level (float)' },
		{ variableId: 'enc_green_stringval', name: 'Encoder: Green level (string)' },
		{ variableId: 'enc_green_floatval', name: 'Encoder: Green level (float)' },
		{ variableId: 'enc_blue_stringval', name: 'Encoder: Blue level (string)' },
		{ variableId: 'enc_blue_floatval', name: 'Encoder: Blue level (float)' },
		{ variableId: 'enc_white_stringval', name: 'Encoder: White level (string)' },
		{ variableId: 'enc_white_floatval', name: 'Encoder: White level (float)' },
		{ variableId: 'enc_cyan_stringval', name: 'Encoder: Cyan level (string)' },
		{ variableId: 'enc_cyan_floatval', name: 'Encoder: Cyan level (float)' },
		{ variableId: 'enc_magenta_stringval', name: 'Encoder: Magenta level (string)' },
		{ variableId: 'enc_magenta_floatval', name: 'Encoder: Magenta level (float)' },
		{ variableId: 'enc_yellow_stringval', name: 'Encoder: Yellow level (string)' },
		{ variableId: 'enc_yellow_floatval', name: 'Encoder: Yellow level (float)' },
		{ variableId: 'enc_amber_stringval', name: 'Encoder: Amber level (string)' },
		{ variableId: 'enc_amber_floatval', name: 'Encoder: Amber level (float)' },
		{ variableId: 'enc_lime_stringval', name: 'Encoder: Lime level (string)' },
		{ variableId: 'enc_lime_floatval', name: 'Encoder: Lime level (float)' },
		{ variableId: 'enc_indigo_stringval', name: 'Encoder: UV level (string)' },
		{ variableId: 'enc_indigo_floatval', name: 'Encoder: UV level (float)' },
		{ variableId: 'enc_uv_stringval', name: 'Encoder: UV level (string)' },
		{ variableId: 'enc_uv_floatval', name: 'Encoder: UV level (float)' },
		{ variableId: 'enc_hue_stringval', name: 'Encoder: Hue level (string)' },
		{ variableId: 'enc_hue_floatval', name: 'Encoder: Hue level (float)' },
		{ variableId: 'enc_cto_stringval', name: 'Encoder: Hue level (string)' },
		{ variableId: 'enc_cto_floatval', name: 'Encoder: Hue level (float)' },
		{ variableId: 'enc_c1_stringval', name: 'Encoder: Hue level (string)' },
		{ variableId: 'enc_c1_floatval', name: 'Encoder: Hue level (float)' },
		{ variableId: 'enc_c2_stringval', name: 'Encoder: Hue level (string)' },
		{ variableId: 'enc_c2_floatval', name: 'Encoder: Hue level (float)' },
		{ variableId: 'enc_ctc_stringval', name: 'Encoder: Hue level (string)' },
		{ variableId: 'enc_ctc_floatval', name: 'Encoder: Hue level (float)' },
		{ variableId: 'enc_shutter_strobe_stringval', name: 'Encoder: Shutter Strobe level (string)' },
		{ variableId: 'enc_shutter_strobe_floatval', name: 'Encoder: Shutter Strobe level (float)' },
		{ variableId: 'enc_saturation_stringval', name: 'Encoder: Saturation level (string)' },
		{ variableId: 'enc_saturation_floatval', name: 'Encoder: Saturation level (float)' },
		{ variableId: 'enc_diffusion_stringval', name: 'Encoder: Diffusion level (string)' },
		{ variableId: 'enc_diffusion_floatval', name: 'Encoder: Diffusion level (float)' },
		/* What else should be implemented? */
		/* also be sure to update getDistinceParamForWheelLabel() in main.js */
	]

	// Too messy to parse/set a name for each wheel. This approach lets us capture
	// anything, but the downside is that you have to figure out what wheel number
	// you need. :( I couldn't find a list of how many there were, lets go for 50.
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

/* For reference on wheel numbers, but changes based on fixture type!! */
/* These are from a random fixture (don't remember which) when testing. */
/* Wouldn't it be great if composer had a script engine so we could grab */
/* these by category and somehow dynamically assign buttons. :) */
/*************************************

1	Encoder Value: Intensity
26	Encoder Value: Zoom
25	Encoder Value: Edge
24	Encoder Value: Iris

5	Encoder Value: Pan
6	Encoder Value: Tilt

7	Encoder Value: X-Focus
8	Encoder Value: Y-Focus
9	Encoder Value: Z-Focus

2	Encoder Value: Red
4	Encoder Value: Green
5	Encoder Value: Blue
8	Encoder Value: White

10	Encoder Value: Cyan
11	Encoder Value: Magenta
12	Encoder Value: Yellow
16	Encoder Value: CTO

13	Encoder Value: C1
?	Encoder Value: C2
14	Encoder Value: Hue
15	Encoder Value: Saturation

3	Encoder Value: Amber
6	Encoder Value: Indigo

?	Inidigo UV ?
?	CTC ?

27	Encoder Value: Strobe
28	Encoder Value: Diffusion

19	Encoder Value: Gobo Select
18	Encoder Value: Gobo Idx/Speed
21	Encoder Value: BeamFX Select
20	Encoder Value: BeamFX Idx/Speed
??	Encoder Value: Gobo2 Select
??	Encoder Value: Gobo2 Idx/Speed
22	Encoder Value: Animation Select
??	Encoder Value: Animation Idx/Speed

34	Encoder Value: Thrust A
33	Encoder Value: Angle A
38	Encoder Value: Thrust B
37	Encoder Value: Angle B
32	Encoder Value: Thrust C
31	Encoder Value: Angle C
36	Encoder Value: Thrust D
35	Encoder Value: Angle D
39	Encoder Value: Frame Assembly

*************************************/
