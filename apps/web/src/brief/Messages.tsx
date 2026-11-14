/** The problem messages beside one field, one line each. */
export function Messages({ messages }: { messages: readonly string[] }) {
  return (
    <>
      {messages.map((message) => (
        <p key={message} className="problem">
          {message}
        </p>
      ))}
    </>
  );
}
