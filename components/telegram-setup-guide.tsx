import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, MessageSquare } from "lucide-react"

export function TelegramSetupGuide() {
  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Follow these steps to set up Telegram notifications for your WorkTrac account.
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="step-1">
          <AccordionTrigger>Step 1: Find the WorkTrac Bot on Telegram</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p>
                Open Telegram and search for <strong>@QintarexBot</strong> or click the link below:
              </p>
              <p>
                <a
                  href="https://t.me/QintarexBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  <MessageSquare className="h-4 w-4" />
                  Open @QintarexBot on Telegram
                </a>
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step-2">
          <AccordionTrigger>Step 2: Start the Bot</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p>
                Click the "Start" button or send the <code>/start</code> command to the bot.
              </p>
              <p>The bot will respond with a welcome message and instructions.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step-3">
          <AccordionTrigger>Step 3: Generate a Verification Code</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p>Return to WorkTrac and click the "Connect Telegram" button in your notification settings.</p>
              <p>This will generate a unique 6-digit verification code that links your Telegram account to WorkTrac.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step-4">
          <AccordionTrigger>Step 4: Send the Verification Code</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p>Send the 6-digit verification code to the bot on Telegram.</p>
              <p>If successful, the bot will confirm that your account is linked.</p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="step-5">
          <AccordionTrigger>Step 5: Configure Your Notification Preferences</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2">
              <p>
                In your WorkTrac notification settings, choose which types of notifications you want to receive via
                Telegram.
              </p>
              <p>You can select "Telegram Only" or "All Channels" for each notification type.</p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="bg-muted p-4 rounded-md mt-4">
        <h3 className="text-sm font-medium flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Benefits of Telegram Notifications
        </h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Receive notifications instantly on your mobile device or desktop</li>
          <li>Keep track of task updates even when you're away from your computer</li>
          <li>Respond quickly to urgent requests and approvals</li>
          <li>Get organized with all your work notifications in one place</li>
        </ul>
      </div>
    </div>
  )
}
