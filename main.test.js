const runEntrypoint = require('@companion-module/base').runEntrypoint
const constants = require('./constants')

jest.mock('@companion-module/base', () => {
	const original = jest.requireActual('@companion-module/base')
	return {
		...original,
		InstanceBase: jest.fn(),
		runEntrypoint: jest.fn(),
	}
})

describe('ModuleInstance', () => {
	let instance

	require('./main')
	const Module = runEntrypoint.mock.calls[0][0]

	beforeEach(() => {
		instance = new Module('')
		instance.instanceState = {}
		instance.checkFeedbacks = jest.fn()
		instance.setVariableValues = jest.fn()
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getConfigFields', () => {
		test('returns expected config fields', () => {
			const configFields = instance.getConfigFields()

			expect(Array.isArray(configFields)).toBe(true)
			expect(configFields.length).toBe(4)
			expect(configFields.map((field) => field.id)).toEqual(['host', 'user_id', 'use_slip', 'num_labels'])
		})
	})

	describe('getNumLabelsToPoll', () => {
		test.each([
			[{ num_labels: 12 }, 12],
			[{ num_labels: '7' }, 7],
			[{ num_labels: 7.9 }, 7],
			[{ num_labels: 0 }, constants.DEFAULT_NUM_LABELS],
			[{ num_labels: -1 }, constants.DEFAULT_NUM_LABELS],
			[{ num_labels: 'abc' }, constants.DEFAULT_NUM_LABELS],
			[{}, constants.DEFAULT_NUM_LABELS],
			[undefined, constants.DEFAULT_NUM_LABELS],
		])('returns %p -> %p', (config, expected) => {
			instance.config = config
			expect(instance.getNumLabelsToPoll()).toBe(expected)
		})
	})

	describe('parseCueName', () => {
		test.each([
			['pending', '1/0.91 test 59.0', { cue_pending_label: ' test', cue_pending_duration: '59.0' }],
			[
				'test',
				'1/2 before after / max. colon : 100% end 1.0 100%',
				{
					cue_test_label: ' before after / max. colon : 100% end',
					cue_test_duration: '1.0',
					cue_test_intensity: '100%',
				},
			],
			[
				'test',
				'1/2 min 0.0 100%',
				{
					cue_test_label: ' min',
					cue_test_duration: '0.0',
					cue_test_intensity: '100%',
				},
			],
			[
				'test',
				'51.1 Drums 3.0 100%',
				{
					cue_test_label: ' Drums',
					cue_test_duration: '3.0',
					cue_test_intensity: '100%',
				},
			],
			[
				'test',
				'51.1 3.0 100%',
				{
					cue_test_label: undefined,
					cue_test_duration: '3.0',
					cue_test_intensity: '100%',
				},
			],
			[
				'test',
				'51.1 3.0',
				{
					cue_test_label: undefined,
					cue_test_duration: '3.0',
				},
			],
		])('parses "%s" cue text "%s"', (type, cueText, expectedValues) => {
			instance.parseCueName(type, cueText)

			expect(instance.setVariableValues).toHaveBeenCalledWith(expectedValues)
			expect(instance.instanceState).toMatchObject(expectedValues)
		})

		test('falls back to raw cue string when parsing fails', () => {
			instance.parseCueName('test', 'not-a-parseable-cue')
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_test_label: 'not-a-parseable-cue',
			})
		})

		test('clears active cue list/number when cue becomes inactive', () => {
			instance.parseCueName('active', '')

			expect(instance.setVariableValues).toHaveBeenNthCalledWith(1, { cue_active_label: '' })
			expect(instance.setVariableValues).toHaveBeenNthCalledWith(2, {
				cue_active_list: '',
				cue_active_num: '',
			})
			expect(instance.checkFeedbacks).toHaveBeenCalledWith('active_cue')
		})
	})
})
