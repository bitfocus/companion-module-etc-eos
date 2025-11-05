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
			expect(configFields.length).toBe(3)
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
	})
})
