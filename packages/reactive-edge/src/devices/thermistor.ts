// This code is based on this Adafruit thermistor example https://learn.adafruit.com/thermistor/using-a-thermistor

import * as five from "johnny-five"
import { interval, Subject } from "rxjs"
import { map } from "rxjs/operators"
import { device } from "aws-iot-device-sdk"

export default function emitTemperature() {

    const Device = new device({
        keyPath: "/home/jocarrito/projects/IoT-React-Grapql-monitor/packages/reactive-edge/certs/private.pem.key",
        certPath: "/home/jocarrito/projects/IoT-React-Grapql-monitor/packages/reactive-edge/certs/certificate.pem.crt",
        caPath: "/home/jocarrito/projects/IoT-React-Grapql-monitor/packages/reactive-edge/certs/rootCA.pem",
        clientId: "Thermistor",
        host: "a1glde582kf7y7.iot.us-west-1.amazonaws.com"
    })

    const pin = 'A0'
    const THERMISTOR_NOMINAL = 10000 // nominal resistance at 25 degrees C
    const NOMINAL_TEMPERATURE = 25
    const BETA_COEFICENT = 3950
    const SERIES_RESISTOR = 10000
    const NUMBER_OF_SAMPLES = 5

    const analogRead$ = new Subject<number>()
    const errors$ = new Subject<string>()
    const messages$ = new Subject<string>()
    const interval$ = interval(10)

    // Device Sampling
    function sample() {
        const board = new five.Board({
            repl: false,
            debug: false,
        })

        board.on("ready", () => {
            const thermistor = new five.Sensor(pin);
 
            messages$.next("board ready")
            const interval = setInterval(() => {
                analogRead$.next(thermistor.value)
            }, 10000)

        })

        board.on("error", () => {
            errors$.next("board error")
        })
    }

    // Simplified Steinhart temperature calculation for a Thermistor
    function calculateTemperature(
        analogRead: number,
        seriesResistor: number,
        thermistorNominal: number,
        bCoefficient: number,
        nominalTemperature: number
    ) {

        return (1 / (((Math.log(
            (seriesResistor / ((1023 / analogRead) - 1))
            / thermistorNominal)) / bCoefficient)
            + (1 / (nominalTemperature + 273.15)
            )))
    }

    // Convert analog read to temperature
    const temperature$ = analogRead$.pipe(map(read => {
        return calculateTemperature(read, SERIES_RESISTOR, THERMISTOR_NOMINAL, BETA_COEFICENT, NOMINAL_TEMPERATURE)
    }))

    // Send data to AWS IoT
    Device.on('connect', function() {
        temperature$.subscribe(temp => {
            Device.publish('temperature', JSON.stringify({ "temperature": (temp - 273.15)}));
        })
    })
    
    sample()
    return {}
}