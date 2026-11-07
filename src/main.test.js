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
			expect(configFields.length).toBe(6)
			expect(configFields.map((field) => field.id)).toEqual([
				'host',
				'user_id',
				'use_slip',
				'num_labels',
				'cue_list',
				'num_cues',
			])
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
	describe('cue list variables', () => {
		beforeEach(() => {
			jest.useFakeTimers()
			instance.config = { host: '127.0.0.1', cue_list: 1, num_cues: 3 }
			instance.cueListRecords = new Map()
			instance.cueListDefinedNumbers = []
			instance.sendOsc = jest.fn()
			instance.setVariableDefinitions = jest.fn()
		})

		afterEach(() => {
			instance.clearCueListTimers()
			jest.useRealTimers()
		})

		const definedIds = () => {
			const calls = instance.setVariableDefinitions.mock.calls
			return calls[calls.length - 1][0].map((def) => def.variableId)
		}

		test.each([
			[{ cue_list: 2, num_cues: 12 }, 2, 12],
			[{ cue_list: '0', num_cues: '0' }, 0, 0],
			[{ cue_list: -1, num_cues: 'abc' }, constants.DEFAULT_CUE_LIST, constants.DEFAULT_NUM_CUES],
			[undefined, constants.DEFAULT_CUE_LIST, constants.DEFAULT_NUM_CUES],
		])('config %p -> list %p, cues %p', (config, list, cues) => {
			instance.config = config
			expect(instance.getCueListToPoll()).toBe(list)
			expect(instance.getNumCuesToPoll()).toBe(cues)
		})

		test('requests the count, then up to num_cues cues by index', () => {
			instance.requestCueList()
			expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/cue/1/count', [], false)

			instance.handleCueListCount('1', 10)
			expect(instance.instanceState.cue_list_count).toBe('10')
			expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/cue/1/index/0', [], false)
			expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/cue/1/index/2', [], false)
			expect(instance.sendOsc).not.toHaveBeenCalledWith('/eos/get/cue/1/index/3', [], false)
		})

		test('does not poll when the cue list is 0', () => {
			instance.config.cue_list = 0
			instance.requestCueList()
			expect(instance.sendOsc).not.toHaveBeenCalled()
			expect(definedIds()).not.toContain('cue_list_count')
		})

		test('fills positional and per-number variables', () => {
			instance.handleCueListRecord('1', '1', '0', '0', 'Preshow')
			instance.handleCueListRecord('1', '10.5', '0', '1', 'Blackout')
			instance.handleCueListRecord('1', '10.5', '2', '1', 'A part') // parts are ignored
			instance.handleCueListRecord('2', '7', '0', '2', 'Other list') // other lists are ignored

			expect(instance.instanceState).toMatchObject({
				cue_index_1_num: '1',
				cue_index_1_label: 'Preshow',
				cue_index_2_num: '10.5',
				cue_index_2_label: 'Blackout',
				cue_index_3_num: '',
				cue_index_3_label: '',
			})

			// Per-number variables are defined in a batch, then filled
			jest.advanceTimersByTime(250)
			expect(definedIds()).toEqual(expect.arrayContaining(['cue_1_label', 'cue_10_5_label', 'cue_index_3_label']))
			expect(instance.instanceState).toMatchObject({ cue_1_label: 'Preshow', cue_10_5_label: 'Blackout' })
		})

		test('reads the cue position from the first argument, not the address', () => {
			instance.log = jest.fn()
			instance.oscSocket = { on: jest.fn(), open: jest.fn(), socket: { on: jest.fn() } }
			instance.setOscSocketListeners()
			const onMessage = instance.oscSocket.on.mock.calls.find((call) => call[0] === 'message')[1]

			// Eos replies to every cue with list/0/<arg count> in the address
			const reply = (num, index, label) => ({
				address: `/eos/out/get/cue/1/${num}/0/list/0/30`,
				args: [
					{ type: 'i', value: index },
					{ type: 's', value: 'uid' },
					{ type: 's', value: label },
				],
			})
			onMessage(reply('1', 0, 'Preshow'))
			onMessage(reply('2', 1, 'Top of show'))
			onMessage(reply('4', 2, 'Blackout'))

			expect(instance.instanceState).toMatchObject({
				cue_index_1_num: '1',
				cue_index_1_label: 'Preshow',
				cue_index_2_num: '2',
				cue_index_3_num: '4',
				cue_index_3_label: 'Blackout',
			})
		})

		test('a change notification re-reads the list once', () => {
			instance.scheduleCueListRefresh()
			instance.scheduleCueListRefresh()
			jest.advanceTimersByTime(500)
			expect(instance.sendOsc).toHaveBeenCalledTimes(1)
			expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/cue/1/count', [], false)
		})
	})
})
