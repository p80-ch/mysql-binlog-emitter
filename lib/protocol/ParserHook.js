module.exports = ParserHook;

function ParserHook(parser)
{
  this._parser = parser;
}

ParserHook.prototype.parseUnsignedNumber = function(length)
{
  if (length > 4)
  {
    var s = '';
    while (length > 4)
    {
      s += this._parser.parseUnsignedNumber(4);
      length -= 4;
    }

    if (length > 0)
    {
      s += this._parser.parseUnsignedNumber(length);
    }
    return parseInt(s, 10);
  }
  else
  {
    return this._parser.parseUnsignedNumber(length);
  }
};

ParserHook.prototype.parseTimestamp = function()
{
  return this._parser.parseUnsignedNumber(4) * 1000;
};

ParserHook.prototype._formatString = function(s)
{
  return s.replace(/\u0000/g, '').trim(); // Replace \u000; Remove EOF
};

ParserHook.prototype.parseString = function(length)
{
  return this._formatString(
    this._parser.parseString(length)
  );
};

ParserHook.prototype.parseStringL = function(length)
{
  return this.parseString(
    (length > 4) ?
    this.parseUnsignedNumber(length) :
    this._parser.parseUnsignedNumber(length)
  );
};

ParserHook.prototype.parseStringEOF = function()
{
  return this._formatString(
    this._parser.parsePacketTerminatedString()
  );
};

ParserHook.prototype.parseString0 = function()
{
  return this._formatString(
    this._parser.parseNullTerminatedString()
  );
};

// ParserHook.prototype._parseNumberValue = function(value, size, int64)
// {
//   var length = size * 8;
//   // Flip bits on negative signed integer
//   if (!int64 && (value & (1 << (length - 1))))
//   {
//     value = ((value ^ (Math.pow(2, length) - 1)) * -1) - 1;
//   }
//   else if (int64 && (int64.high & (1 << 31)))
//   {
//     // Javascript integers only support 2^53 not 2^64, must trim bits!
//     // 64-53 = 11, 32-11 = 21, so grab first 21 bits of high word only
//     var mask = Math.pow(2, 32) - 1;
//     var high = this.sliceBits(int64.high ^ mask, 0, 21);
//     var low = int64.low ^ mask;

//     value = ((high * Math.pow(2, 32)) * -1) - this._UInt32Value(low) - 1;
//   }

//   return value;
// };


// ParserHook.prototype._sliceBits = function(input, start, end)
// {
//   // ex: start: 10, end: 15 = "111110000000000"
//   var match = (((1 << end) - 1) ^ ((1 << start) - 1));
//   return (input & match) >> start;
// };


// ParserHook.prototype._UInt32Value = function(input)
// {
//   // Last bit is not sign, it is part of value!
//   return (input & (1 << 31)) ?
//     Math.pow(2, 31) + (input & ((1 << 31) - 1)) :
//     input;
// };
