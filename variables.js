module.exports = function (self) {
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
	]

	// N9YTY
	// Too messy to parse/set a name for each wheel. This approach lets us capture
	// anything, but the downside is that you have to figure out what wheel number
	// you need. :( I couldn't find a list of how many there were, lets go for 40.
	// In testing I didn't find one higher than that, but it may need to be adjusted.
	for (let i = 1; i <= 40; i++) {
		variableDefinitions.push({ variableId: `wheel_label_${i}`, name: `Wheel ${i}'s label` })
		variableDefinitions.push({ variableId: `wheel_stringval_${i}`, name: `Wheel ${i}'s string value` })
		variableDefinitions.push({ variableId: `wheel_cat_${i}`, name: `Wheel ${i}'s category` })
		variableDefinitions.push({ variableId: `wheel_floatval_${i}`, name: `Wheel ${i}'s float value` })
	}

	// There are 6 soft keys, and 6 alternates (exposed with {More SK}).
	for (let i = 1; i <= 12; i++) {
		variableDefinitions.push({ variableId: `softkey_label_${i}`, name: `Soft key ${i}'s label` })
	}

	self.setVariableDefinitions(variableDefinitions)

	const variableValues = {}
	// Initialize the default values for the variables
	for (let i = 0; i < variableDefinitions.length; i++) {
		variableValues[variableDefinitions[i].variableId] = ''
	}
	self.setVariableValues(variableValues)
}

/* For reference on wheel numbers, don't know if this changes or not */

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
