'use strict';

const StringRequest = require("./StringRequest");

class JsonRequest extends StringRequest {
    getData() {
        return JSON.parse( this._buffer );
    }
}

module.exports = JsonRequest;
