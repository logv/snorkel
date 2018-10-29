/*!
* HEX <=> RGB Conversion
* Copyright(c) 2011 Daniel Lamb <daniellmb.com>
* MIT Licensed
*/

(function (context) {

    context['toRGB'] = function (/* String */ color) {
        // summary:
        //	Converts a 6 digit Hexadecimal string value to an RGB integer array.
        //      Important! input must be a 6 digit Hexadecimal string "bad" will
        //      not convert correctly but "bbaadd" will. To keep the function as
        //      light as possible there is no idiot-proofing, if you pass in bad
        //      data I'm not fixing it for you :-)
        //
        // color: String
        //      6 digit Hexadecimal string value
        //
        // returns: Array
        //	An array containing the RGB integers in the following format [red, green, blue]
        //
        // example:
        //	Convert the Hexadecimal value "c0ffee" (blue color) to RGB integers.
        //      The variable "rgb" will be equal to [192, 255, 238]
        //
        //	var rgb = toRGB("c0ffee");

        //convert string to base 16 number
        var num = parseInt(color, 16);

        //return the red, green and blue values as a new array
        return [num >> 16, num >> 8 & 255, num & 255];
    };

    context['toHex'] = function (/* Number */ red, /* Number */ green, /* Number */ blue) {
        // summary:
        //	Converts 3 RGB integer values into a Hexadecimal string.
        //      Important! input must be integers with a range of 0 to 255.
        //      To keep the function as light as possible there is no idiot-proofing,
        //      if you pass in bad data I'm not fixing it for you :-)
        //
        // red: Number
        //	number ranging from 0 to 255 indicating the amount of red
        // green: Number
        //	number ranging from 0 to 255 indicating the amount of green
        // blue: Number
        //	number ranging from 0 to 255 indicating the amount of blue
        //
        // returns: String
        //	6 digit Hexadecimal string value
        //
        // example:
        //      Convert the RGB values [192, 255, 238] (blue color) to Hexadecimal string.
        //      The variable "hex" will be equal to "c0ffee"
        //
        //      var hex = toHex(192, 255, 238);

        //return 6 digit Hexadecimal string
        return ((blue | green << 8 | red << 16) | 1 << 24).toString(16).slice(1);
    };

})(window);

