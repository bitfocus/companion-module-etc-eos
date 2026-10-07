const constants = require('./constants.js')

/**
 * 
 * @param {number} param_index 
 * @param {number} start_index 
 * @param {{}[]} arguments 
 * @returns {any|null}
 */
function get_list_param(param_index, start_index, arguments) {
    if (start_index > param_index) return null;
    let list_index = param_index - start_index;
    if (list_index >= arguments.length) return null;

    if (arguments[list_index] === undefined) {
        return "sdfldsjf;asldfjkas;lfdkjas";
    }

    return arguments[list_index].value;
}

class EosSync {
    constructor(parameters) {
        for (const item_type of constants.LABEL_NAMES) {
            this[item_type] = new Map();
        }
        
        this.feedback_numbers = new Map();
    }

    /**
     * Clear information about an item
     * 
     * We only clear the label here, so we keep the subscriptions and can use them when updating later
     * 
     * @param {string} item_type 
     * @param {string} item_num 
     */
    set_item_deleted(item_type, item_number) {

        let obj = this[item_type].get(item_number);
        obj.label = undefined;
        return obj.subscriptions ?? [];
    }

    /**
     * 
     * @param {string} item_type 
     * @param {string} item_num 
     * @param {number} list_start_index 
     * @param {{}[]} list_values 
     * @returns {string[]} list of feedback IDs subscribed to this thing
     */
    set_item_values(item_type, item_number, list_start_index, list_values) {        
        let label = get_list_param(2, list_start_index, list_values)
        if (label !== undefined) {
            let subs = this[item_type].get(item_number)?.subscriptions ?? [];

            this[item_type].set(item_number, {
                label: label,
                subscriptions: subs
            });

            return subs;
        }

        return [];
    }

    /**
     * 
     * @param {string} item_type 
     * @param {string} item_number 
     * @param {string} feedback_id 
     */
    get_item_value(item_type, item_number, feedback_id) {
        let prev_feedback_num = this.feedback_numbers.get(feedback_id);
        if (prev_feedback_num !== undefined) {
            if (prev_feedback_num != item_number) {
                this.remove_item_subscription(item_type, prev_feedback_num, feedback_id);
            }
        }
        this.feedback_numbers.set(feedback_id, item_number);

        let item = this[item_type].get(item_number);

        if (item === undefined) {
            // not synced from Eos, we still store the subscriptions though
            this[item_type].set(item_number, {
                subscriptions: [feedback_id]
            });
            return '';
        }

        // register subscription ID
        if (!item.subscriptions.includes(feedback_id)) {
            item.subscriptions.push(feedback_id)
        }

        return item.label ?? '';
    }

    /**
     * 
     * @param {string} item_type 
     * @param {string} item_number 
     * @param {string} feedback_id 
     * @returns 
     */
    remove_item_subscription(item_type, item_number, feedback_id) {
        this.feedback_numbers.delete(feedback_id);
        let item = this[item_type].get(item_number);

        if (item === undefined) return;

        const index = item.subscriptions.indexOf(feedback_id);
        if (index > -1) {
            item.subscriptions.splice(index, 1);
        }
    }

    reset() {
        for (const item_type of constants.LABEL_NAMES) {
            let items = this[item_type];
            // this also clears out all of our subscriptions
            // however they will be re-registered next time the callback runs
            items.clear();
        }
    }

}

module.exports.EosSync = EosSync
module.exports.get_list_param = get_list_param
