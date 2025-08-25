export default function Video16x9({ src }: { src: string }) {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded border"
          src={src}
          title="CoachDeck Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    </div>
  );
}
      