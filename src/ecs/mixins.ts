import * as EventEmitter from "eventemitter3";
import { EventQueue } from "rot-js";
import { Entity, EntityAction } from "./entities";

/**
 * forEach callback for a set of AbortControllers. Triggers cancellation for all callbacks
 */
function cancelAll(controller: AbortController, _ignore: AbortController, set: Set<AbortController>) {
    controller.abort();
    set.delete(controller);
}

export class ActionQueue {
    /**
     * Action stack
     */
    protected readonly actions: EntityAction[] = [];


    /**
     * Wakeup notifier
     */
    protected readonly wakeup = new EventEmitter<'added'>();

    /**
     * Cancellation controllers to trigger before moving to next action
     */
    cancellation = new Set<AbortController>();

    /**
     * Action cap
     */
    cap = 1;

    /**
     * Action consumption per turn
     */
    consumption = 1;

    async action() {
        for (let i = 0, n = this.consumption; i < n; i++) {
            // Pop the newest action, or block/wait until an action is available
            const action = this.actions.pop() ?? await new Promise(resolve => this.wakeup.once('added', a => resolve(this.actions.pop() ?? a)));
            if (action) {
                // stop older / less recent tasks which may already be running
                this.cancel();
                // create new cancellation token
                const controller = new AbortController;
                this.cancellation.add(controller);
                // do action
                await action(controller.signal);
            }
        }
    }

    /**
     * Adds a turn action to the action stack
     * @param action action to add
     * @returns true if the action was added, false otherwise
     */
    push(action: EntityAction) {
        if (this.actions.length < this.cap) {
            this.actions.push(action);
            this.wakeup.emit('added');
            return true;
        }
        return false;
    }

    /**
     * Stop all running actions
     */
    cancel() {
        this.cancellation.forEach(cancelAll);
    }
}

export class Timer {
    protected readonly queue = new EventQueue<Runnable>();
    protected current: Runnable | null = null;
    protected elapsed: number = 0;

    tick(dt: number) {
        if (this.current ??= this.queue.get()) {
            this.elapsed += dt;
            if (this.elapsed >= this.queue.getTime()) {
                this.current();
                this.current = this.queue.get();
            }
        }
        return true;
    }

    /**
     * Returns a Promise that resolves after t seconds
     * @param t time in seconds
     */
    sleep(t: number) {
        return new Promise(resolve => this.queue.add(resolve, t));
    }

    /**
     * Adds a task to the event queue
     * @param callback callback to execute
     * @param delay optional delay, delay is immediate execution
     */
    defer(callback: (signal: AbortSignal) => any, delay: number = 0) {
        const controller = new AbortController;
        this.queue.add(() => callback(controller.signal), delay);
        return controller;
    }
}

/**
 * Type alias for any constructor name
 */
interface Constructor {
    new (...args: any[]): {};
}

/**
 * Closure alias
 */
interface Runnable {
    (): void;
}

/**
 * Mixes a blocking action queue into the given superclass
 * @param superclass superclass to extend
 */
export function EntityActionQueueMixin<T extends Constructor>(superclass: T) {
    return class extends superclass implements Entity {
        readonly queue = new ActionQueue;
        action() {
            return this.queue.action();
        }
    };
}

/**
 * Mixes an asynchronous timed event processor into the given superclass
 * @param superclass superclass to extend
 */
export function EntityTimerMixin<T extends Constructor>(superclass: T) {
    return class extends superclass implements Entity {
        readonly timer = new Timer;
        tick(dt: number) {
            return this.timer.tick(dt);
        }
    };
}