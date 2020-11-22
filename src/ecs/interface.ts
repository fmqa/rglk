import { Periodic } from "./entities";
import { Timer } from "./helpers";

/**
 * Text object container
 */
export interface TextObject {
    text?: string;
}

/**
 * Positioned text object
 */
export interface PositionedText extends TextObject {
    x: number;
    y: number;
}

/**
 * Timed flashcard-like controller for text objects
 */
export class TextFlasher implements Periodic {
    protected readonly timer = new Timer;
    protected controller?: AbortController;

    /**
     * Factory for text flashcard controller
     * @param subject text object to operate on
     */
    constructor(public subject: TextObject) { }

    tick(dt: number) {
        return this.timer.tick(dt);
    }

    /**
     * Flash a text string for the given time duration
     * @param value text to flash
     * @param duration reset delay
     */
    flash(value: string, duration: number) {
        // Abort existing task
        this.controller?.abort();
        // Set text
        this.subject.text = value;
        // Defer erasure of text property for the given duration
        const controller = this.timer.defer(signal => signal.aborted || delete this.subject.text, duration);
        // Remove cancel token on abort
        controller.signal.addEventListener('abort', () => { 
            delete this.controller
            delete this.subject.text;
        });
        // Assign task token
        this.controller = controller;
        return controller;
    }

    /**
     * Unflash/remove currently displayed text string
     */
    unflash() {
        this.controller?.abort();
        delete this.controller
        delete this.subject.text;
    }
}