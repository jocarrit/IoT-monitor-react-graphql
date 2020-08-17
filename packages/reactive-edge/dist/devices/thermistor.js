"use strict";
// This code is based on this Adafruit thermistor example https://learn.adafruit.com/thermistor/using-a-thermistor
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const five = __importStar(require("johnny-five"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const aws_iot_device_sdk_1 = require("aws-iot-device-sdk");
function emitTemperature() {
    const Device = new aws_iot_device_sdk_1.device({
        keyPath: "/home/jocarrito/projects/IoT-React-Grapql-monitor/packages/reactive-edge/certs/private.pem.key",
        certPath: "/home/jocarrito/projects/IoT-React-Grapql-monitor/packages/reactive-edge/certs/certificate.pem.crt",
        caPath: "/home/jocarrito/projects/IoT-React-Grapql-monitor/packages/reactive-edge/certs/rootCA.pem",
        clientId: "Thermistor",
        host: "a1glde582kf7y7.iot.us-west-1.amazonaws.com"
    });
    const pin = 'A0';
    const THERMISTOR_NOMINAL = 10000; // nominal resistance at 25 degrees C
    const NOMINAL_TEMPERATURE = 25;
    const BETA_COEFICENT = 3950;
    const SERIES_RESISTOR = 10000;
    const NUMBER_OF_SAMPLES = 5;
    const analogRead$ = new rxjs_1.Subject();
    const errors$ = new rxjs_1.Subject();
    const messages$ = new rxjs_1.Subject();
    const interval$ = rxjs_1.interval(10);
    function sample() {
        const board = new five.Board({
            repl: false,
            debug: false,
        });
        board.on("ready", () => {
            const thermistor = new five.Sensor(pin);
            messages$.next("board ready");
            const interval = setInterval(() => {
                analogRead$.next(thermistor.value);
            }, 10000);
            /*setTimeout(() => {
                clearInterval(interval)
                return
            }, 100)*/
        });
        board.on("error", () => {
            errors$.next("board error");
        });
    }
    // Simplified Steinhart temperature calculation for a Thermistor
    function calculateTemperature(analogRead, seriesResistor, thermistorNominal, bCoefficient, nominalTemperature) {
        return (1 / (((Math.log((seriesResistor / ((1023 / analogRead) - 1))
            / thermistorNominal)) / bCoefficient)
            + (1 / (nominalTemperature + 273.15))));
    }
    /*voltage$.subscribe(sample => {
        let temp = calculateTemperature(sample, SERIES_RESISTOR, THERMISTOR_NOMINAL, BETA_COEFICENT, NOMINAL_TEMPERATURE)
        console.log(temp - 273.15)
    })*/
    const temperature$ = analogRead$.pipe(operators_1.map(read => {
        return calculateTemperature(read, SERIES_RESISTOR, THERMISTOR_NOMINAL, BETA_COEFICENT, NOMINAL_TEMPERATURE);
    }));
    Device.on('connect', function () {
        temperature$.subscribe(temp => {
            Device.publish('temperature', JSON.stringify({ "temperature": temp }));
        });
    });
    sample();
    return {};
}
exports.default = emitTemperature;
//# sourceMappingURL=thermistor.js.map