import { Redirect } from 'expo-router';

/** Dettaglio predizione rimosso: torna al feed. */
export default function PredictionDetailRemoved() {
  return <Redirect href="/" />;
}
