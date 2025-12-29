// Import the necessary modules and classes
const runEntrypoint = require('@companion-module/base').runEntrypoint
const { InstanceStatus } = require('@companion-module/base')

// Mock Companion to get the class
jest.mock('@companion-module/base', () => {
	const original = jest.requireActual('@companion-module/base')
	return {
		...original,
		InstanceBase: jest.fn(),
		runEntrypoint: jest.fn(),
	}
})

// Define the test suite for ModuleInstance
describe('ModuleInstance', () => {
	let instance

	const ModuleInstance = require('./main')
	const module = runEntrypoint.mock.calls[0][0]

	beforeEach(() => {
		instance = new module('')
		instance.instanceState = {}
		instance.checkFeedbacks = jest.fn()
		instance.setVariableValues = jest.fn()
		instance.wheels = [] // Initialize wheels array
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	describe('getConfigFields', () => {
		test('should return an array of config fields', () => {
			// Invoke the method
			instance.config = {
				supportsManualAdjustments: false,
			}
			const configFields = instance.getConfigFields()

			// Assertions
			expect(Array.isArray(configFields)).toBe(true)
			expect(configFields.length).toBe(10)
		})
	})

	describe('parseCueName', () => {
		test('should handle an active cue', () => {
			expect(instance.parseCueName('active', '')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalled()
			expect(instance.checkFeedbacks).toHaveBeenCalledWith('active_cue')
		})

		test('should handle a pending cue < 1 min', () => {
			expect(instance.parseCueName('pending', '1/0.91 test 59.0')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_pending_duration: '59.0',
				cue_pending_intensity: undefined,
				cue_pending_label: ' test',
			})
		})

		test('should handle a cue with unusual characters in the label', () => {
			expect(instance.parseCueName('test', '1/2 before after / max. colon : 100% end 1.0 100%')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_test_duration: '1.0',
				cue_test_intensity: '100%',
				cue_test_label: ' before after / max. colon : 100% end',
			})
		})

		test('should handle a cue with shortest time', () => {
			expect(instance.parseCueName('test', '1/2 min 0.0 100%')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_test_duration: '0.0',
				cue_test_intensity: '100%',
				cue_test_label: ' min',
			})
		})

		test('should handle a cue with level', () => {
			expect(instance.parseCueName('test', '51.1 Drums 3.0 100%')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_test_duration: '3.0',
				cue_test_intensity: '100%',
				cue_test_label: ' Drums',
			})
		})

		test('should handle a cue with level but no label', () => {
			expect(instance.parseCueName('test', '51.1 3.0 100%')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_test_duration: '3.0',
				cue_test_intensity: '100%',
				// TODO(Peter): Should be cue number as per code comments
				cue_test_label: undefined,
			})
		})

		test('should handle a cue with no label', () => {
			expect(instance.parseCueName('test', '51.1 3.0')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_test_duration: '3.0',
				cue_test_intensity: undefined,
				// TODO(Peter): Should be cue number as per code comments
				cue_test_label: undefined,
			})
		})

		test('should clear active cue when cue is " 0.0 "', () => {
			expect(instance.parseCueName('active', ' 0.0 ')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_active_list: '',
				cue_active_num: '',
			})
			expect(instance.checkFeedbacks).toHaveBeenCalledWith('active_cue')
		})

		test('should clear active cue when cue is empty', () => {
			expect(instance.parseCueName('active', '')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_active_list: '',
				cue_active_num: '',
			})
			expect(instance.checkFeedbacks).toHaveBeenCalledWith('active_cue')
		})

		test('should handle cue with list format (1/1)', () => {
			expect(instance.parseCueName('test', '1/1 Opening 5.0 100%')).toEqual()
			expect(instance.setVariableValues).toHaveBeenCalledWith({
				cue_test_duration: '5.0',
				cue_test_intensity: '100%',
				cue_test_label: ' Opening',
			})
		})
	})

	describe('setInstanceStates', () => {
		test('should update internal state', () => {
			instance.setInstanceStates({ key1: 'value1', key2: 'value2' }, false)
			expect(instance.instanceState.key1).toBe('value1')
			expect(instance.instanceState.key2).toBe('value2')
		})

		test('should update variables when isVariable is true', () => {
			instance.setInstanceStates({ varKey: 'varValue' }, true)
			expect(instance.instanceState.varKey).toBe('varValue')
			expect(instance.setVariableValues).toHaveBeenCalledWith({ varKey: 'varValue' })
		})

		test('should not update variables when isVariable is false', () => {
			instance.setInstanceStates({ stateKey: 'stateValue' }, false)
			expect(instance.instanceState.stateKey).toBe('stateValue')
			expect(instance.setVariableValues).not.toHaveBeenCalled()
		})
	})

	describe('emptyWheelData', () => {
		test('should initialize 100 wheels with empty data', () => {
			instance.emptyWheelData()
			expect(instance.wheels.length).toBe(101) // 0-100
			expect(instance.wheels[1].label).toBe('')
			expect(instance.wheels[1].stringval).toBe('')
			expect(instance.wheels[1].cat).toBe('')
			expect(instance.wheels[1].floatval).toBe('')
			expect(instance.wheels[100].label).toBe('')
		})
	})

	describe('emptyState', () => {
		test('should clear state but preserve connection status', () => {
			instance.instanceState = {
				connected: true,
				cue_active_label: 'Test Cue',
				cue_pending_label: 'Next Cue',
			}
			instance.emptyState()
			expect(instance.instanceState.connected).toBe(true)
			expect(instance.instanceState.cue_active_label).toBeUndefined()
			expect(instance.instanceState.cue_pending_label).toBeUndefined()
		})

		test('should trigger feedback checks', () => {
			instance.emptyState()
			expect(instance.checkFeedbacks).toHaveBeenCalledWith('pending_cue', 'active_cue', 'connected')
		})
	})

	describe('setConnectionState', () => {
		beforeEach(() => {
			instance.updateStatus = jest.fn()
		})

		test('should update status to Ok when connected', () => {
			const InstanceStatus = require('@companion-module/base').InstanceStatus
			instance.setConnectionState(true)
			expect(instance.updateStatus).toHaveBeenCalledWith(InstanceStatus.Ok)
			expect(instance.instanceState.connected).toBe(true)
		})

		test('should update status to Disconnected when not connected', () => {
			const InstanceStatus = require('@companion-module/base').InstanceStatus
			instance.setConnectionState(false)
			expect(instance.updateStatus).toHaveBeenCalledWith(InstanceStatus.Disconnected)
			expect(instance.instanceState.connected).toBe(false)
		})

		test('should check feedbacks when connection state changes', () => {
			instance.instanceState.connected = false
			instance.setConnectionState(true)
			expect(instance.checkFeedbacks).toHaveBeenCalledWith('connected')
		})

		test('should not check feedbacks when connection state unchanged', () => {
			instance.instanceState.connected = true
			instance.setConnectionState(true)
			expect(instance.checkFeedbacks).not.toHaveBeenCalledWith('connected')
		})
	})

	describe('getDistinctParamForWheelLabel', () => {
		test('should return empty string for null label', () => {
			const result = instance.getDistinctParamForWheelLabel(null)
			expect(result).toBe('')
		})

		test('should return empty string for empty label', () => {
			const result = instance.getDistinctParamForWheelLabel('')
			expect(result).toBe('')
		})

		test('should return mapped param for valid label', () => {
			const ParamMap = require('./param_map').ParamMap
			// Test with a known mapping if ParamMap has entries
			const testLabel = Object.keys(ParamMap)[0]
			if (testLabel) {
				const result = instance.getDistinctParamForWheelLabel(testLabel.toUpperCase())
				expect(result).toBe(ParamMap[testLabel])
			}
		})
	})

	describe('setIntensity', () => {
		beforeEach(() => {
			instance.sendOsc = jest.fn()
			instance.config = { host: '192.168.1.1' }
		})

		test('should send percentage value for channel', () => {
			instance.setIntensity('chan', 1, 75)
			expect(instance.sendOsc).toHaveBeenCalledWith('chan/1', [{ type: 'f', value: 75 }])
		})

		test('should send normalized value for sub', () => {
			instance.setIntensity('sub', 5, 50)
			expect(instance.sendOsc).toHaveBeenCalledWith('sub/5', [{ type: 'f', value: 0.5 }])
		})

		test('should cap value at 100 for channel', () => {
			instance.setIntensity('chan', 2, 150)
			expect(instance.sendOsc).toHaveBeenCalledWith('chan/2', [{ type: 'f', value: 100 }])
		})

		test('should cap value at 100 for sub', () => {
			instance.setIntensity('sub', 3, 150)
			expect(instance.sendOsc).toHaveBeenCalledWith('sub/3', [{ type: 'f', value: 1.0 }])
		})

		test('should handle special command "out"', () => {
			instance.setIntensity('chan', 10, 'out')
			expect(instance.sendOsc).toHaveBeenCalledWith('chan/10/out', [])
		})

		test('should handle special command "full"', () => {
			instance.setIntensity('group', 5, 'full')
			expect(instance.sendOsc).toHaveBeenCalledWith('group/5/full', [])
		})

		test('should handle special command "min"', () => {
			instance.setIntensity('chan', 7, 'min')
			expect(instance.sendOsc).toHaveBeenCalledWith('chan/7/min', [])
		})
	})

	describe('config validation', () => {
		test('should have valid IP regex in config fields', () => {
			const configFields = instance.getConfigFields()
			const hostField = configFields.find(f => f.id === 'host')
			expect(hostField).toBeDefined()
			expect(hostField.regex).toBeDefined()
		})

		test('should have valid defaults for numeric fields', () => {
			const constants = require('./constants.js')
			const configFields = instance.getConfigFields()
			
			const wheelsField = configFields.find(f => f.id === 'wheels_per_cat')
			expect(wheelsField.default).toBe(constants.WHEELS_PER_CAT)
			
			const groupLabelsField = configFields.find(f => f.id === 'num_group_labels')
			expect(groupLabelsField.default).toBe(constants.NUM_GROUP_LABELS)
			
			const eosPortField = configFields.find(f => f.id === 'eos_port')
			expect(eosPortField.default).toBe(constants.EOS_PORT)
		})

		test('should have min/max constraints on numeric fields', () => {
			const configFields = instance.getConfigFields()
			const portField = configFields.find(f => f.id === 'eos_port')
			expect(portField.min).toBe(1)
			expect(portField.max).toBe(65535)
		})
	})
})
