type Props = {
  selected?: string | null;
  onSelect: (file: string) => void;
};

const presets = import.meta.glob('/src/assets/avatars/*.{png,webp,jpg}', { eager: true }) as Record<string, { default: string }>;

export default function PresetGrid({ selected, onSelect }: Props) {
  const entries = Object.entries(presets).map(([path, mod]) => ({ file: path.split('/').pop()!, url: mod.default }));

  return (
    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
      {entries.map(({ file, url }) => (
        <button key={file} onClick={() => onSelect(file)} className={`overflow-hidden rounded-lg ${selected === file ? 'ring-2 ring-[#945d3f]' : 'ring-0'}`}>
          <img src={url} alt={file} className="w-full h-20 object-cover" />
        </button>
      ))}
    </div>
  );
}
