import { IntentHandler, isIntentCompleted, IntentNames, resolveSlotValues } from "../../intents";
import { HandlerInput } from "ask-sdk-core/dist/dispatcher/request/handler/HandlerInput";
import { RecordExpenseCommand } from "../../shared/models/expense";
import { IntentRequest, Intent } from "ask-sdk-model";

export class RecordExpenseCompletedIntent implements IntentHandler {

    canHandle(handlerInput: HandlerInput): boolean {

        return isIntentCompleted(IntentNames.RECORD_EXPENSES, handlerInput);
    }    
    
    async handle(handlerInput: HandlerInput): Promise<any> {

        let outSpeech = '';

            try {
                const request: IntentRequest = <IntentRequest>handlerInput.requestEnvelope.request;
                console.log(`Request read @ completed intent ${JSON.stringify(request)}`);

                const currentIntent: Intent = request.intent;

                const slotValues: any = resolveSlotValues(currentIntent);
                const validation: SlotValidation = validateSlots(slotValues);

                console.debug(`Slotvalidations ${JSON.stringify(validation)}`);

                if(!validation.allValid) {
                    return handlerInput
                        .responseBuilder
                        .speak(validation.speech)
                        .addElicitSlotDirective('wholeValue', currentIntent)
                        .withShouldEndSession(false)
                        .getResponse();
                } 

                const ec: RecordExpenseCommand = extractRecordExpenseCommand(slotValues);

                await recordExpense(ec);

                outSpeech = `Done! I recorded the expense of ${ec.amount} dollars under ${ec.expenseType} for the date ${ec.expenseDate}. Please let me know if you want to add any more expenses.`;

            } catch (error) {
                
                outSpeech = 'I am really sorry. I am unable to access part of my memory. Please try again later';
                console.warn(`Failed to record expense. Error is : ${error.message}`); 
            }
            
            return handlerInput
                .responseBuilder
                .speak(outSpeech)
                .withShouldEndSession(false)
                .getResponse();
    }

}

function extractRecordExpenseCommand(slotValues: any): RecordExpenseCommand {

    const label: string = slotValues.expenseType.synonym;
    const expenseType: string = slotValues.expenseType.resolved;
    
    const amount =  extractAmount(slotValues);
    const now = Date.now();
    const expenseDate = slotValues.expenseDate.resolved || now.toLocaleString('en-US');

    return {
        amount,
        expenseType,
        expenseDate,
        label,
        userId: ''
    };
}

async function recordExpense(recCom: RecordExpenseCommand): Promise<any> {
 
    // const expenseService: ExpenseService = new ExpenseService();
    // const response = await expenseService.recordExpense(recCom);

    return recCom;
}

function validateSlots(slotValues: any): SlotValidation {
    
    const amount: number = extractAmount(slotValues);
    
    if(amount < 0) {
        return {
            allValid: false,
            speech: `Please tell me a valid amount. You can say something like 10 dollars and 50 cents which has both dollars cents. Or you can tell a dollar value or cents value. `
        }
    }

    if(amount === 0) {
        return {
            allValid: false,
            speech: `You said you have spent zero amount. Ha ha, I got your trick! I won't record any expense then.`
        }
    }

    return {allValid: true};
}


interface SlotValidation {
    allValid: boolean;
    speech?: string;
}

function extractAmount(slotValues: any): number {

    if(slotValues.amount && slotValues.amount.resolved) {
        const c: string = slotValues.amount.resolved.substring(0,1);
        const v: string = slotValues.amount.resolved.substring(1);
        const vn: number = Number.parseFloat(v);

        if(c === '$' && vn > 0) {
            return vn;
        } else if( Number.parseFloat(c) > 0 && Number.parseFloat(slotValues.amount.resolved) > 0) {
            return Number.parseFloat(slotValues.amount.resolved);
        } else {
            return -1;
        }
    } else {
        return -1;
    }
}
