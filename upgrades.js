const { CreateConvertToBooleanFeedbackUpgradeScript } = require('@companion-module/base')

module.exports = [
	CreateConvertToBooleanFeedbackUpgradeScript({
		pending_cue: true,
		active_cue: true,
		connected: true,
	}),
	/*
	 * Place your upgrade scripts here
	 * Remember that once it has been added it cannot be removed!
	 */
	// function (context, props) {
	// 	return {
	// 		updatedConfig: null,
	// 		updatedActions: [],
	// 		updatedFeedbacks: [],
	// 	}
	// },
]
