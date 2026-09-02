// src/ai/phoneDetection.js

import * as cocoSsd from "@tensorflow-models/coco-ssd";
import "@tensorflow/tfjs";

let model = null;
let initializing = false;

// Lower threshold for small objects like phones
const PHONE_CONFIDENCE_THRESHOLD = 0.15;


// ---------------------------------------------
// Initialize phone detection model
// ---------------------------------------------

export async function initializePhoneDetector() {

    if (model) {
        return model;
    }

    if (initializing) {
        return null;
    }

    try {

        initializing = true;

        console.log("Initializing phone detection model...");

        model = await cocoSsd.load({
            base: "lite_mobilenet_v2",
        });

        console.log(
            "Phone detection model initialized successfully"
        );

        console.log(
            "COCO-SSD phone detector is ready"
        );

        return model;

    } catch (error) {

        console.error(
            "Phone detection initialization failed:",
            error
        );

        model = null;

        throw error;

    } finally {

        initializing = false;

    }
}


// ---------------------------------------------
// Detect phone
// ---------------------------------------------

export async function detectPhone(video) {

    if (!video || !model) {

        console.warn(
            "Phone detection skipped: video or model unavailable"
        );

        return {
            detected: false,
            confidence: 0,
        };

    }

    try {

        const predictions = await model.detect(
            video,
            20,
            PHONE_CONFIDENCE_THRESHOLD
        );

        // -----------------------------------------
        // DEBUG ALL OBJECTS
        // -----------------------------------------

        console.log(
            "📦 COCO-SSD objects:",
            predictions.map((prediction) => ({
                class: prediction.class,
                confidence: Number(prediction.score.toFixed(3)),
                bbox: prediction.bbox,
            }))
        );


        // -----------------------------------------
        // FIND PHONE
        // -----------------------------------------

        const phone = predictions.find((prediction) => {

            const detectedClass =
                prediction.class
                    ?.toLowerCase()
                    ?.trim();

            return (
                detectedClass === "cell phone" ||
                detectedClass === "cellphone" ||
                detectedClass === "mobile phone"
            );

        });


        // -----------------------------------------
        // NO PHONE
        // -----------------------------------------

        if (!phone) {

            console.log(
                "📱 No phone detected"
            );

            return {
                detected: false,
                confidence: 0,
            };

        }


        // -----------------------------------------
        // PHONE FOUND
        // -----------------------------------------

        const confidence = phone.score;

        console.log(
            `📱 PHONE DETECTED: ${(confidence * 100).toFixed(1)}%`
        );

        console.log(
            "Phone bounding box:",
            phone.bbox
        );


        return {

            detected: true,

            confidence,

            boundingBox: phone.bbox,

        };

    } catch (error) {

        console.error(
            "Phone detection error:",
            error
        );

        return {

            detected: false,

            confidence: 0,

        };

    }
}


// ---------------------------------------------
// Reset detector
// ---------------------------------------------

export function resetPhoneDetector() {

    model = null;

    initializing = false;

}