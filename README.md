# webtask-test
A simple script that sends github notifications as SMS

## How to use
This script is designed to work with [webtask][webtask], however it can be modified to run in any node.js environment. This documentation assumes you're using webtask.

1. Install the webtask cli tool by running `npm install -g wt-cli` (use sudo if necessary).
2. Initialize the cli tool by running `wt init` (follow instructions).
3. Create a webtask by running `wt create https://raw.githubusercontent.com/xkizer/webtask-test/master/webtask.js --no-parse --no-merge` (this is an express app, so the options are necessary).
4. wt-cli will create your webtask and print a URL for you on the screen (Something like `https://webtask.it.auth0.com/api/run/wt-kizer-kizer_com_ng-0/webtask?webtask_no_cache=1`). Copy this to your clipboard.
5. Head to the github repository you want to receive SMS alerts for (you must have admin privilege).
6. On the repo page, click "Settings". From the menu on the left, click "Webhooks & services".
7. Click on "Add webhook".
8. In the page that appears, under "Payload URL", paste the URL you copied from step 4. Modify this URL by adding `&to=XXXX&from=YYYYY`, where `XXXX` is the phone number you want the message to be sent to (full international number, complete with country code), and `YYYY` is an optional number/text that will be shown as the sender of the SMS. The final URL should look something like `https://webtask.it.auth0.com/api/run/wt-kizer-kizer_com_ng-0/webtask?webtask_no_cache=1&to=2348030001112223&from=GithubTask`.
9. Make sure "Content type" is set as "application/json". Leave the secret empty, as it is not supported currently.
10. Under "Which events would you like to trigger this webhook?", select "Send me **everything**."
11. Click "Add webhook", and you are good to go.

Because I did not have much time, I simply implemented the commit comment hook for the initial version. This will only process events triggered by comments on a commit. So, to test this, go to a commit in your repo and add a comment (commit comment or line comment).

[webtask]: https://webtask.io
