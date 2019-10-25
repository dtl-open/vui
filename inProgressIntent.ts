import { IntentHandler, isIntentStillInprogress, IntentNames, handleInprogressIntent } from "../../intents";
import { HandlerInput } from "ask-sdk-core/dist/dispatcher/request/handler/HandlerInput";
import { requiredSlots } from ".";

export class RecordExpenseInprogressIntent implements IntentHandler {

    canHandle(handlerInput: HandlerInput): boolean {
        const request = handlerInput.requestEnvelope.request;

        return request.type === 'IntentRequest'
            && request.intent.name === intentName
            && request.dialogState === 'IN_PROGRESS';
    }

    async handle(handlerInput: HandlerInput): Promise<any> {

        return handleInprogressIntent(handlerInput, requiredSlots);
    }
}

export async function handleInprogressIntent(handlerInput: HandlerInput, requiredSlots: string[]): Promise<any> {

    const request: IntentRequest = <IntentRequest>handlerInput.requestEnvelope.request;
    const currentIntent: Intent = request.intent;
    let prompt: string = '';

    console.debug(`Checking inprogress intent slots ${JSON.stringify(currentIntent.slots)}`);

    for (const slotName in currentIntent.slots) {
        if (Object.prototype.hasOwnProperty.call(currentIntent.slots, slotName)) {

            const currentSlot = currentIntent.slots[slotName];
            const resolution = extractResolution(currentSlot);

            if (resolution) {

                const slotIsResolvedToMultipleValues = resolution.status.code === 'ER_SUCCESS_MATCH' && resolution.values.length > 1;
                const slotIsRequiredButNotFilled = resolution.status.code === 'ER_SUCCESS_NO_MATCH' && (requiredSlots.indexOf(currentSlot.name) > -1);

                console.debug(`Resolutions ${JSON.stringify(resolution)}`);

                if (slotIsResolvedToMultipleValues) {

                    return askUserToResolveAmbiguity(resolution, currentSlot);

                } else if (slotIsRequiredButNotFilled) {

                    return askUserToFillMissingSlot(currentSlot);
                }
            }
        }

    }

    return handlerInput.responseBuilder
        .addDelegateDirective(currentIntent)
        .getResponse();

    function askUserToFillMissingSlot(currentSlot: any) {

        console.debug(`Asking user to fill the missing slot.`);

        prompt = `What ${currentSlot.name} are you looking for`;

        return handlerInput.responseBuilder
            .speak(prompt)
            .reprompt(prompt)
            .addElicitSlotDirective(currentSlot.name)
            .getResponse();
    }

    function askUserToResolveAmbiguity(resolution: any, currentSlot: any) {

        console.debug(`Value resolved to multiple values, so asking user to clear the ambiguity.`);

        const values = resolution.values;
        prompt = 'Which would you like';
        const size = values.length;
        values
            .forEach((element: any, index: number) => {
                prompt += ` ${(index === size - 1) ? ' or' : ' '} ${element.value.name}`;
            });
        prompt += '?';
        return handlerInput.responseBuilder
            .speak(prompt)
            .reprompt(prompt)
            .addElicitSlotDirective(currentSlot.name)
            .getResponse();
    }
}

export function resolveSlotValues(currentIntent: Intent): any {


    const filledSlots: any = currentIntent.slots;
    const slotValues = {};

    console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);
    
    Object.keys(filledSlots).forEach((item) => {
        const name = filledSlots[item].name;

        const resolution = extractSlotResolution(filledSlots, item)

        if (resolution && resolution.status && resolution.status.code) {

            switch (resolution.status.code) {
                case 'ER_SUCCESS_MATCH':
                    slotValues[name] = {
                        synonym: filledSlots[item].value,
                        resolved: resolution.values[0].value.name,
                        isValidated: true,
                    };
                    break;
                case 'ER_SUCCESS_NO_MATCH':
                    slotValues[name] = {
                        synonym: filledSlots[item].value,
                        resolved: filledSlots[item].value,
                        isValidated: false,
                    };
                    break;
                default:
                    break;
            }

        } else {

            slotValues[name] = {
                synonym: filledSlots[item].value,
                resolved: filledSlots[item].value,
                isValidated: false,
            };
        }
    });

    return slotValues;
}

function extractSlotResolution(filledSlots: any, item: string) {
    return filledSlots[item] &&
        filledSlots[item].resolutions &&
        filledSlots[item].resolutions.resolutionsPerAuthority[0];
}

function extractResolution(currentSlot: any): any {

    return currentSlot.confirmationStatus !== 'CONFIRMED'
        && currentSlot.resolutions
        && currentSlot.resolutions.resolutionsPerAuthority[0];
}
