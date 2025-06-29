const { combineRgb } = require('@companion-module/base')

module.exports = function (self) {
	self.setPresetDefinitions({
		cue_trigger: {
			type: 'button',
			category: 'Cues',
			name: 'A button to trigger a cue, and feedbacks to show if the cue is active.',
			style: {
				text: 'Cue\n#',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							// add an action on down press
							actionId: 'run_cue',
							options: {
								// options values to use
								list: '1',
								number: '#',
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'pending_cue',
					options: {
						list: '1',
						number: '#',
					},
				},
				{
					feedbackId: 'active_cue',
					options: {
						list: '1',
						number: '#',
					},
				},
			],
		},
		cue_stop: {
			type: 'button',
			category: 'Cues',
			name: 'The Stop/Back cue button',
			style: {
				text: 'Stop/Back',
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							// add an action on down press
							actionId: 'stop_back',
							options: {},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		},
		cue_go: {
			type: 'button',
			category: 'Cues',
			name: "The Go cue button. Also shows the cue's intensity.",
			style: {
				text: `Go $(etc-eos3:cue_pending_num)\\n$(etc-eos3:cue_active_intensity)`,
				size: '14',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							// add an action on down press
							actionId: 'next_cue',
							options: {},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		},
		show_cue: {
			type: 'button',
			category: 'Status',
			name: 'Shows the current cue number and label',
			style: {
				text: `Live cue:\\n$(etc-eos3:cue_active_num): $(etc-eos3:cue_active_label)`,
				size: '7',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [],
			feedbacks: [],
		},
		show_showname: {
			type: 'button',
			category: 'Status',
			name: 'Shows the current show name',
			style: {
				text: `Show name:\\n$(etc-eos3:show_name)`,
				size: '7',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [],
			feedbacks: [],
		},
		show_cmd: {
			type: 'button',
			category: 'Status',
			name: 'Shows the command line for the current user.',
			style: {
				text: `$(eos-etc3:cmd)`,
				size: '7',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [],
			feedbacks: [],
		},
		macro_name: {
    type: 'button',
    category: 'Macros',
    name: 'Macro # Name',
    style: {
        text: '$(etc-eos-christopher:macro_1_label)',
        size: '14',
        color: combineRgb(255, 255, 192),
        bgcolor: combineRgb(204, 101, 0),
    },
    steps: [
        {
            down: [
                {
                    actionId: 'run_macro',
                    options: { macro: '1' }, // Ersetze #### durch die gewünschte Macro-Nummer, z.B. '1'
                },
            ],
            up: [],
        },
    ],
    feedbacks: [],
},
	})
}
