import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface EventOptions {
    location?: string;
    reminder?: boolean;
    colorTheme?: string;
  }

export interface EventDoc extends BaseDoc {
    creator: ObjectId; // User who created the event
    title: string;
    date: Date;
    description?: string;
    attendees?: ObjectId[]; // List of users attending the event
    options?: EventOptions;
  }


/**
 * concept: Calendaring [Event]
 */
export default class CalendarConcept {
    public readonly events: DocCollection<EventDoc>;

    constructor(collectionName: string) {
      this.events = new DocCollection<EventDoc>(collectionName);
    }

    async create(creator: ObjectId, title: string, date: Date, description?: string, attendees?: ObjectId[]) {
      const _id = await this.events.createOne({ creator, title, date, description, attendees });
      return { msg: "Event successfully created!", event: await this.events.readOne({ _id }) };
    }

    async getEvents() {
      return await this.events.readMany({}, { sort: { date: 1 } });
    }

    async getByUser(user: ObjectId) {
      return await this.events.readMany({ attendees: user });
    }

    async update(_id: ObjectId, title?: string, date?: Date, description?: string, attendees?: ObjectId[]) {
      await this.events.partialUpdateOne({ _id }, { title, date, description, attendees });
      return { msg: "Event successfully updated!" };
    }

    async delete(_id: ObjectId) {
      await this.events.deleteOne({ _id });
      return { msg: "Event deleted successfully!" };
    }
  }

export class EventCreatorNotMatchError extends NotAllowedError {
    constructor(
      public readonly creator: ObjectId,
      public readonly _id: ObjectId,
    ) {
      super("{0} is not the creator of event {1}!", creator, _id);
    }
  }
