// These are the definitions of encoder wheel parameters
//
// The key is the value returned by EOS when the param is updated
// the value is the base name of the encoder variable, which will
// have both {value}_stringval and {value}_floatval variables created. 
//
// NOTE: key is lower case
//
const ParamMap = {
	'intens': 				'enc_intensity',
	'zoom':					'enc_zoom',
	'edge':					'enc_edge',
	'iris':					'enc_iris',
	'pan':					'enc_pan',
	'tilt':					'enc_tilt',
	'x focus':				'enc_x_focus',
	'y focus':				'enc_y_focus',
	'z focus':				'enc_z_focus',
	'red':					'enc_red',
	'green':				'enc_green',
	'blue':					'enc_blue',
	'white':				'enc_white',
	'cyan':					'enc_cyan',
	'magenta':				'enc_magenta',
	'yellow':				'enc_yellow',
	'amber':				'enc_amber',
	'lime':					'enc_lime',
	'indigo':				'enc_indigo',
	'uv':					'enc_uv',
	'red adj':				'enc_red_adj',
	'green adj':			'enc_green_adj',
	'blue adj':				'enc_blue_adj',
	'white adj':			'enc_white_adj',
	'cyan adj':				'enc_cyan_adj',
	'magenta adj':			'enc_magenta_adj',
	'yellow adj':			'enc_yellow_adj',
	'amber adj':			'enc_amber_adj',
	'lime adj':				'enc_lime_adj',
	'indigo adj':			'enc_indigo_adj',
	'hue':					'enc_hue',
	'cto':					'enc_cto',
	'ctb':					'enc_ctb',
	'color select':			'enc_c1',
	'color mix mspeed':		'enc_c2',
	'ctc':					'enc_ctc',
	'shutter strobe':		'enc_shutter_strobe',
	'saturatn':				'enc_saturation',
	'diffusion':			'enc_diffusion',
	'angle a':				'enc_angle_a',
	'angle b':				'enc_angle_b',
	'angle c':				'enc_angle_c',
	'angle d':				'enc_angle_d',
	'thrust a':				'enc_thrust_a',
	'thrust b':				'enc_thrust_b',
	'thrust c':				'enc_thrust_c',
	'thrust d':				'enc_thrust_d',
	'frame assembly':		'enc_frame_assembly',
}

module.exports = { ParamMap }
