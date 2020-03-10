# ETC Eos Module

## Configure your console 

Exit out of your console and enter the Eos Shell (Eos Configuration Utility).

Open **Settings** and click on **Network**. Make a note of your console's IP address.

![console-ip](documentation/images/console-ip.jpg)

Scroll down to the **Interface Protocols** section and make sure the OSC TCP Format is **TCP format for OSC 1.0 (packet length headers)** (the default option). Save your changes by pressing the **Accept** button, then launch your console.

![osc-1.0](documentation/images/osc-1.0.jpg)



Once your console has started, make sure the **OSC RX** and **OSC TX** options are enabled (they are by default). The location may vary depending on your console's version, but it should be somewhere close to **Setup > System > Show Control > OSC**.

![enable-osc](documentation/images/enable-osc.jpg)

*Previous versions of this module asked you to change the OSC [UDP] RX Port. This is no longer required. You should reset the field back to `0` if you're not using it for another purpose.*


## Configure Companion

Add and configure the module in Companion.

The **Target IP** will be the IP address of your Eos console.

The **User ID** field lets you choose which user these commands should be executed under on your console. This user must first be setup on your console or your actions won't work. The default user in this module (and on your console) is User ID 1.

You should use a different **User ID** if someone will be running your console while it's being controlled through Companion (especially if you use the **Custom Command** action) otherwise your actions and command lines may conflict with each other.

*A User ID of `-1` refers to whichever user the console is currently set to.*


## Actions

While it's not practical to create specific actions for every possible command available in your light console, some common actions/keys have been added, although the **Custom Command** action is the most flexible.

| Action              | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| Custom Command      | Runs a custom command. See the section below for more information. |
| Key: Go             | Runs the next cue in the current list.<br />This is the same as pressing the **Go** button on your console. |
| Key: Stop/Back      | Press once to stop the current cue (if it's running), and again to move back to the previous cue in the list.<br />This is the same as pressing the **Stop/Back** button on your console. |
| Run Cue             | Runs a specific cue in a cue list.                           |
| Run Macro | Runs a specific macro. |
| Channel Intensity   | Sets a channel's intensity to a percentage, or to keyword: `out`, `full`, `min`, `max`. |
| Group Intensity     | Sets a group's intensity to a percentage, or to a keyword: `out`, `full`, `min`, `max`. |
| Submaster Intensity | Sets a submaster's intensity to a percentage, or to a keyword: `out`, `full`, `min`, `max`. |
| Submaster Bump      | Simulates a submaster's bump button. The **State** property can be:<br />  - Press and Release<br />  - Press and Hold<br />  - Release<br /><br />*Hint: Add this action to a down/on action to **Press and Hold**, and a **Release** action to up/off, then make the button **Latch/Toggle**.* |


## Dynamic variables

Dynamic variables are available to use in button's text and provide realtime information about your console.

For example, a button with this text `Live Cue:\n$(etc-eos:cue_active_num) - $(etc-eos:cue_active_label)` would show the active cue number and that cue's label.

Note: `\n` is used to put a new line in the button's text. It's unrelated to using a dynamic variable.

A list of the available variables is listed on the module's config page, and is also available below:

| Variable                        | Description                         | Example value  |
| ------------------------------- | ----------------------------------- | -------------- |
| $(etc-eos:cue_active_list)      | The active cue list number          | 1              |
| $(etc-eos:cue_active_num)       | The active cue number               | 30             |
| $(etc-eos:cue_active_label)     | The active cue label                | Intermission   |
| $(etc-eos:cue_active_duration)  | The active cue duration in seconds  | 3.0            |
| $(etc-eos:cue_active_intensity) | The active cue intensity percent    | 100%           |
| $(etc-eos:cue_pending_list)     | The pending cue list number         | 1              |
| $(etc-eos:cue_pending_num)      | The pending cue number              | 40             |
| $(etc-eos:cue_pending_label)    | The pending cue label               | Act 3          |
| $(etc-eos:cue_pending_duration) | The pending cue duration in seconds | 3.0            |
| $(etc-eos:show_name)            | The name of the show                | My show        |
| $(etc-eos:cmd)                  | The command line for the user       | LIVE: Cue 20 : Sub 1 @ 60 # |
| $(etc-eos:softkey_label_1)      | Soft key 1's label                  | Attributes     |
| $(etc-eos:softkey_label_2)      | Soft key 2's label                  | Fw/Hg          |
| $(etc-eos:softkey_label_3)      | Soft key 3's label                  | AutoMark Off   |
| $(etc-eos:softkey_label_4)      | Soft key 4's label                  | Link/Loop      |
| $(etc-eos:softkey_label_5)      | Soft key 5's label                  | Execute        |
| $(etc-eos:softkey_label_6)      | Soft key 6's label                  |                |
| $(etc-eos:softkey_label_7)      | Soft key 7's label                  |                |
| $(etc-eos:softkey_label_8)      | Soft key 8's label                  |                |
| $(etc-eos:softkey_label_9)      | Soft key 9's label                  |                |
| $(etc-eos:softkey_label_10)     | Soft key 10's label                 |                |
| $(etc-eos:softkey_label_11)     | Soft key 11's label                 | Offset         |
| $(etc-eos:softkey_label_12)     | Soft key 12's label                 | AutoBlk Clean  |

_Soft keys 7-12 are the alternates available when you toggle the {More SK} button._


## Feedbacks

Feedbacks let a button's style change when something happens. There are three feedbacks available:

| Feedback                           | Description                                                  |
| ---------------------------------- | ------------------------------------------------------------ |
| When cue is pending                | Changes the button's foreground and background color when the cue that's pending on the console matches the one entered in the `Cue List/Number` fields. |
| When cue is active                 | Changes the button's foreground and background color when the cue that's active the console matches the one entered in the `Cue List/Number` fields. |
| When connection to console changes | Changes the button's foreground and background color when Companion's connection to the Eos console changes (connected or disconnected). |

*Note: ETC Element consoles only have a single cue list: `1`.*

## Presets

Presets help you quickly configure new buttons. There are several presets available:

| Category | Name                       | Description                                                  |
| -------- | -------------------------- | ------------------------------------------------------------ |
| Cues     | Cue #                      | Runs the cue number. Adds feedback to show whether this cue is active or is pending. *Don't forget to change the cue number in the feedbacks too!* |
| Cues     | Go [CUE] [INTENSITY%]      | The same as the "Go" button on your console. Also shows the pending cue number and the cue's intensity as the button's text. |
| Cues     | Stop/Back                  | The same as the "Stop/Back" button on your console.          |
| Status   | [CURRENT CUE NUMBER/LABEL] | *No action when pressed.* Shows the number and label of the current cue. |
| Status   | [SHOW NAME]                | *No action when pressed.* Shows the name of the loaded show. |
| Status   | [COMMAND LINE]             | *No action when pressed.* Shows the command line for the user (set in the module's config). |




### Custom command

This can be used to run complex commands that aren't possible to create using the above actions.

Each custom command has three properties:

- **Before**:
  - **Clear command line** of anything that may already be on it.
  - **Keep command line** and append this command to it.
- **Command**: The command to run.
- **After**:
  - **Add to command line** but don't run the command.
  - **Run this command**.

You can use these properties to create actions on different buttons and piece together complete commands from different button presses.



#### Examples

| Command                       | Eos Result                                        |
| ----------------------------- | ------------------------------------------------- |
| `Go_to_cue 5`                 | Triggers cue 5 with its timing.                   |
| `Chan 12 thru 16 at 100`      | Sets intensity of channels 12-16 to 100%.         |
| `Chan 4 sneak 5`              | Sneaks channel 4 over 5 seconds.                  |
| `Chan 4 sneak 1:30`           | Sneaks channel 4 over 1 minute 30 seconds.        |
| `Chan 1.1 thru 1.12 at 50`    | Sets Channel 1 Cell 1 thru Chan 1 Cell 12 to 50%. |
| `Group 1 at out`              | Group 1 intensity to 0%.                          |
| `Chan 80 thru 100 Effect 150` | Runs effect 150 on channels 80-100.               |
| `Chan 80 thru 100 Effect`     | Stops effects on channels 80-100.                 |

