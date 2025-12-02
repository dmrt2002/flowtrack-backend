const testData = '{"subject":"Re: Re: Thanks for reaching out\u0021","textBody":"hi","senderName":"FlowTrack"}';
console.log('Raw string:', testData);
try {
  const parsed = JSON.parse(testData);
  console.log('Parsed successfully:', parsed);
} catch (error) {
  console.log('Parse error:', error.message);
}
