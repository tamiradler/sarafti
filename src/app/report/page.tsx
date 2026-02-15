import { ReportForm } from "@/components/forms/report-form";

type SearchParamValue = string | string[] | undefined;

function getValue(value: SearchParamValue): string | undefined {
  const result = Array.isArray(value) ? value[0] : value;
  return result || undefined;
}

export default function ReportPage({
  searchParams
}: {
  searchParams: Record<string, SearchParamValue>;
}) {
  return (
    <ReportForm
      restaurantId={getValue(searchParams.restaurantId)}
      submissionId={getValue(searchParams.submissionId)}
    />
  );
}
