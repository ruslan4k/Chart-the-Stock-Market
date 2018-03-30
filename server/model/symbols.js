const mongoose = require('mongoose');
const Schema = mongoose.Schema;


var symbolSchema = new Schema({
    symbols: {
        type: [String],
        default: []
    }
})
module.exports = mongoose.model('Symbol', symbolSchema);