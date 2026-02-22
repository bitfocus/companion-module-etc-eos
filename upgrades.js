const { CreateConvertToBooleanFeedbackUpgradeScript } = require('@companion-module/base')
const constants = require('./constants')

module.exports = [
	CreateConvertToBooleanFeedbackUpgradeScript({
		pending_cue: true,
		active_cue: true,
		connected: true,
	}),
	function v2_2_3(context, props) {
		const changes = {
			updatedConfig: null,
			updatedActions: [],
			updatedFeedbacks: [],
		}

		if (props.config) {
			const configuredValue = Number(props.config.num_labels)
			if (!Number.isFinite(configuredValue) || Math.floor(configuredValue) <= 0) {
				props.config.num_labels = constants.DEFAULT_NUM_LABELS
				changes.updatedConfig = props.config
			}
		}

		return changes
	},
]
