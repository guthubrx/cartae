/**
 * Parser pour fichiers calendrier iCalendar (.ics)
 * Extrait événements, dates, participants
 */

import ICAL from 'ical.js';
import { BaseAttachmentParser } from '../../base/IAttachmentParser';
import type { ParsedAttachment, ParseOptions } from '../../base/ParsedAttachment';

export class IcsParser extends BaseAttachmentParser {
  readonly name = 'IcsParser';

  readonly supportedMimeTypes = ['text/calendar', 'application/ics'];

  readonly supportedExtensions = ['.ics'];

  async parse(
    contentBytes: string,
    _mimeType: string,
    options: ParseOptions = {}
  ): Promise<ParsedAttachment> {
    try {
      const buffer = this.base64ToArrayBuffer(contentBytes);
      const icsText = new TextDecoder('utf-8').decode(buffer);

      // Parser ICS
      const jcalData = ICAL.parse(icsText);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');

      const events = vevents.map(vevent => {
        const event = new ICAL.Event(vevent);
        return {
          summary: event.summary || '(no title)',
          location: event.location || '',
          description: event.description || '',
          startDate: event.startDate?.toJSDate(),
          endDate: event.endDate?.toJSDate(),
          organizer: vevent.getFirstPropertyValue('organizer')?.toString() || '',
          attendees: vevent
            .getAllProperties('attendee')
            .map(a => a.getFirstValue()?.toString() || ''),
        };
      });

      // Texte summary
      const text = events
        .map(
          e =>
            `${e.summary}\n${e.startDate?.toLocaleString()} - ${e.endDate?.toLocaleString()}\n${e.description}`
        )
        .join('\n\n');

      return {
        type: 'ics',
        text: this.limitText(text, options.textLimit),
        data: { events },
        metadata: {
          size: buffer.byteLength,
          rowCount: events.length,
          format: 'iCalendar (ICS)',
        },
      };
    } catch (error) {
      return {
        type: 'ics',
        metadata: { size: 0 },
        error: `Erreur parsing ICS: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
