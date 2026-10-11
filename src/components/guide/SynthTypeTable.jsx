import { SYNTH_INFO } from '@/audio/synths/param-defs';

/** The five synth types with their one-line descriptions, from the same table as the Add Synth menu. */
export default function SynthTypeTable({ cellClass }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr>
          <th scope="col" className={`${cellClass} font-semibold`}>Type</th>
          <th scope="col" className={`${cellClass} font-semibold`}>Sound</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(SYNTH_INFO).map(([type, { label, description }]) => (
          <tr key={type}>
            <th scope="row" className={`${cellClass} font-normal`}>{label}</th>
            <td className={cellClass}>{description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
