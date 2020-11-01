import * as EventEmitter from "eventemitter3";
import { EventQueue } from "rot-js";
import { Entity, EntityAction } from "./entities";

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
 * forEach callback for a set of AbortControllers. Triggers cancellation for all callbacks
 */
function cancelAll(controller: AbortController, _ignore: AbortController, set: Set<AbortController>) {
    controller.abort();
    set.delete(controller);
}

/**
 * Mixes a blocking action queue into the given superclass
 * @param superclass superclass to extend
 */
export function ActionQueueMixin<T extends Constructor>(superclass: T) {
    return class extends superclass implements Entity {
        /**
         * Action stack
         */
        protected readonly actions: EntityAction<this>[] = [];

        /**
         * Action limit
         */
        actop = 1;

        /**
         * Cancellation controllers to trigger before moving to next action
         */
        protected cancellation = new Set<AbortController>();

        /**
         * Wakeup notifier
         */
        protected readonly wakeup = new EventEmitter<'added'>();

        async action() {
            // Pop the newest action, or block/wait until an action is available
            const action = this.actions.pop() ?? await new Promise(resolve => this.wakeup.once('added', a => resolve(this.actions.pop() ?? a)));
            if (action) {
                // stop older / less recent tasks which may already be running
                this.cancel();
                // create new cancellation token
                const controller = new AbortController;
                this.cancellation.add(controller);
                // do action
                await action(this, controller.signal);
            }
        }

        /**
         * Adds a turn action to the action stack
         * @param action action to add
         * @returns true if the action was added, false otherwise
         */
        push(action: EntityAction<this>) {
            if (this.actions.length < this.actop) {
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
    };
}

/**
 * Mixes an asynchronous timed event processor into the given superclass
 * @param superclass superclass to extend
 */
export function TimerMixin<T extends Constructor>(superclass: T) {
    return class extends superclass implements Entity {
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
        defer(callback: (signal: AbortSignal, context: this) => any, delay: number = 0) {
            const controller = new AbortController;
            this.queue.add(() => callback(controller.signal, this), delay);
            return controller;
        }
    };
}