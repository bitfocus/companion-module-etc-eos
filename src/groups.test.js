const UpdateActions = require('./actions')
const UpdatePresetDefinitions = require('./presets')

describe('Select Group', () => {
	let self, action
	const context = { parseVariablesInString: async (s) => s }

	beforeEach(() => {
		self = { setActionDefinitions: jest.fn(), sendOsc: jest.fn(), log: jest.fn() }
		UpdateActions(self)
		action = self.setActionDefinitions.mock.calls[0][0].select_group
	})

	test('selects the group over OSC by default', async () => {
		await action.callback({ options: { id: '5', method: 'osc' } }, context)
		expect(self.sendOsc).toHaveBeenCalledWith('group/5', [])
	})

	test('can type Group N Enter on the command line instead', async () => {
		await action.callback({ options: { id: '12.5', method: 'cmd' } }, context)
		expect(self.sendOsc).toHaveBeenCalledWith('newcmd', [{ type: 's', value: 'Group 12.5#' }])
	})

	test('ignores values that are not group numbers', async () => {
		await action.callback({ options: { id: '5/full', method: 'osc' } }, context)
		expect(self.sendOsc).not.toHaveBeenCalled()
		expect(self.log).toHaveBeenCalled()
	})
})

describe('Group presets', () => {
	test('one select-group preset per group in the show, showing its label', () => {
		const self = {
			setPresetDefinitions: jest.fn(),
			labelDefinedNumbers: { group: ['1', '2001', '5.5'], macro: ['90'], preset: [] },
		}
		UpdatePresetDefinitions(self)
		const presets = self.setPresetDefinitions.mock.calls[0][0]

		const groups = Object.keys(presets).filter((id) => id.startsWith('group_'))
		expect(groups).toEqual(['group_1', 'group_2001', 'group_5_5'])
		expect(presets.group_2001.style.text).toBe('G2001\n$(etc-eos:group_label_2001)')
		expect(presets.group_5_5.style.text).toBe('G5.5\n$(etc-eos:group_label_5_5)')
		expect(presets.group_2001.steps[0].down[0]).toEqual({
			actionId: 'select_group',
			options: { id: '2001', method: 'osc' },
		})
		expect(Object.keys(presets).filter((id) => id.startsWith('macro_'))).toEqual(['macro_90'])
	})
})
