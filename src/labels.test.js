const runEntrypoint = require('@companion-module/base').runEntrypoint

jest.mock('@companion-module/base', () => {
	const original = jest.requireActual('@companion-module/base')
	return { ...original, InstanceBase: jest.fn(), runEntrypoint: jest.fn() }
})

describe('group/preset/macro labels', () => {
	let instance, onMessage

	require('./main')
	const Module = runEntrypoint.mock.calls[0][0]

	const definedIds = () => {
		const calls = instance.setVariableDefinitions.mock.calls
		return calls[calls.length - 1][0].map((def) => def.variableId)
	}
	const reply = (type, num, index, label) => ({
		address: `/eos/out/get/${type}/${num}/list/0/3`,
		args: [
			{ type: 'i', value: index },
			{ type: 's', value: 'uid' },
			...(label === undefined ? [] : [{ type: 's', value: label }]),
		],
	})
	const count = (type, n) => ({ address: `/eos/out/get/${type}/count`, args: [{ type: 'i', value: n }] })

	beforeEach(async () => {
		jest.useFakeTimers()
		instance = new Module('')
		instance.updateStatus = jest.fn()
		instance.setActionDefinitions = jest.fn()
		instance.setFeedbackDefinitions = jest.fn()
		instance.setVariableDefinitions = jest.fn()
		instance.setVariableValues = jest.fn()
		instance.setPresetDefinitions = jest.fn()
		instance.checkFeedbacks = jest.fn()
		instance.log = jest.fn()
		instance.getOsc10Socket = () => ({
			on: jest.fn(),
			open: jest.fn(),
			close: jest.fn(),
			socket: { on: jest.fn(), connect: jest.fn(), destroy: jest.fn(), readyState: 'open' },
		})
		await instance.init({ host: '127.0.0.1', num_labels: 3, cue_list: 0 })
		instance.sendOsc = jest.fn()
		onMessage = instance.oscSocket.on.mock.calls.find((call) => call[0] === 'message')[1]
	})

	afterEach(async () => {
		await instance.destroy()
		jest.useRealTimers()
	})

	test('asks for the count, then only the targets that exist, by index', () => {
		instance.requestLabelLists()
		expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/group/count', [], false)
		expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/preset/count', [], false)
		expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/macro/count', [], false)

		onMessage(count('group', 2))
		expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/group/index/0', [], false)
		expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/group/index/1', [], false)
		expect(instance.sendOsc).not.toHaveBeenCalledWith('/eos/get/group/index/2', [], false)

		// Capped by Labels to poll (3)
		onMessage(count('macro', 500))
		expect(instance.sendOsc.mock.calls.filter((c) => c[0].startsWith('/eos/get/macro/index/')).length).toBe(3)
	})

	test('creates variables and presets for existing targets, keyed by their number', () => {
		onMessage(count('group', 3))
		onMessage(reply('group', '1', 0, 'FOH DSR'))
		onMessage(reply('group', '2001', 2, 'Movers'))
		onMessage(reply('group', '5.5', 1, 'Booms'))
		onMessage(count('preset', 0))
		onMessage(count('macro', 0))
		jest.advanceTimersByTime(100)

		const ids = definedIds()
		expect(ids).toEqual(expect.arrayContaining(['group_label_1', 'group_label_5_5', 'group_label_2001']))
		expect(ids).not.toContain('group_label_2')
		expect(instance.instanceState).toMatchObject({
			group_label_1: 'FOH DSR',
			group_label_5_5: 'Booms',
			group_label_2001: 'Movers',
		})
		const presets = instance.setPresetDefinitions.mock.calls.at(-1)[0]
		expect(Object.keys(presets)).toEqual(expect.arrayContaining(['group_1', 'group_5_5', 'group_2001']))
	})

	test('a reply without a label is used as an empty label instead of throwing', () => {
		onMessage(count('macro', 1))
		expect(() => onMessage(reply('macro', '90', 0, undefined))).not.toThrow()
		jest.advanceTimersByTime(100)
		expect(definedIds()).toContain('macro_label_90')
		expect(instance.instanceState.macro_label_90).toBe('')
	})

	test('a missing reply does not block the list forever', () => {
		onMessage(count('group', 2))
		onMessage(reply('group', '1', 0, 'FOH DSR'))
		jest.advanceTimersByTime(5100)
		expect(definedIds()).toContain('group_label_1')
		expect(instance.instanceState.group_label_1).toBe('FOH DSR')
	})

	test('selecting a different channel does not re-read labels', () => {
		onMessage({ address: '/eos/out/active/chan', args: [{ type: 's', value: '101 [100] Spot' }] })
		expect(instance.sendOsc.mock.calls.some((c) => /\/eos\/get\/(group|preset|macro)/.test(c[0]))).toBe(false)
	})

	test('a change notice re-reads that type once, keeping the old labels until the new ones arrive', () => {
		onMessage(count('group', 1))
		onMessage(reply('group', '1', 0, 'Old'))
		jest.advanceTimersByTime(100)
		instance.sendOsc.mockClear()

		onMessage({ address: '/eos/out/notify/group/list/0/2', args: [{ type: 'i', value: 7 }, { type: 's', value: '1' }] })
		onMessage({ address: '/eos/out/notify/group/list/0/2', args: [{ type: 'i', value: 8 }, { type: 's', value: '1' }] })
		jest.advanceTimersByTime(500)
		expect(instance.sendOsc).toHaveBeenCalledTimes(1)
		expect(instance.sendOsc).toHaveBeenCalledWith('/eos/get/group/count', [], false)

		onMessage(count('group', 1))
		expect(instance.instanceState.group_label_1).toBe('Old')
		onMessage(reply('group', '1', 0, 'New'))
		expect(instance.instanceState.group_label_1).toBe('New')
	})

	test.each([
		'/eos/out/color/hs',
		'/eos/out/active/chan',
		'/eos/out/active/cue/text',
		'/eos/out/pending/cue/text',
		'/eos/out/previous/cue/text',
		'/eos/out/user/1/cmd',
		'/eos/out/active/wheel/1',
		'/eos/out/get/group/1/list/0/1',
	])('%s with no arguments does not error', (address) => {
		instance.config.user_id = '1'
		expect(() => onMessage({ address, args: [] })).not.toThrow()
		expect(instance.log).not.toHaveBeenCalledWith('error', expect.anything())
	})

	test('an error while handling a message names the message', () => {
		instance.parseCueName = () => {
			throw new Error('boom')
		}
		onMessage({ address: '/eos/out/active/cue/text', args: [{ type: 's', value: 'x' }] })
		expect(instance.log).toHaveBeenCalledWith('error', 'Error handling Eos message /eos/out/active/cue/text: boom')
	})
})
