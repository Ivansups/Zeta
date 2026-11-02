"""Command-line interface to parse university schedule Excel spreadsheets."""

import argparse
import asyncio
import json
from pathlib import Path

import openpyxl

from backend.schedule.excel_parser import ScheduleExcelParser
from backend.schedule.llm_fallback import HttpLLMClient, LLMFallbackService


def parse_args() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Parse university schedule Excel file into JSON."
    )
    parser.add_argument(
        "--input",
        "-i",
        required=True,
        type=Path,
        help="Path to the schedule .xlsx file",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Path to write the resulting JSON",
    )
    parser.add_argument(
        "--llm-api-key",
        type=str,
        default=None,
        help="API key for OpenAI-compatible LLM endpoint (fallback)",
    )
    parser.add_argument(
        "--llm-base-url",
        type=str,
        default="https://api.openai.com/v1",
        help="Base URL for LLM API",
    )
    parser.add_argument(
        "--llm-model",
        type=str,
        default="gpt-4o-mini",
        help="Model name for LLM fallback",
    )
    return parser.parse_args()


async def run_cli() -> None:
    """Execute parser from command line options."""
    args = parse_args()

    fallback_service: LLMFallbackService | None = None
    if args.llm_api_key:
        client = HttpLLMClient(
            api_key=args.llm_api_key,
            base_url=args.llm_base_url,
            model=args.llm_model,
        )
        fallback_service = LLMFallbackService(client=client)

    wb = openpyxl.load_workbook(args.input, data_only=True)
    parser = ScheduleExcelParser(llm_service=fallback_service)
    result = await parser.parse_workbook(wb)

    output_data = {
        "stats": {
            "total_cells": result.total_cells_processed,
            "regex_parsed": result.regex_parsed_count,
            "llm_parsed": result.llm_parsed_count,
            "unresolved": result.unresolved_count,
            "total_lessons": len(result.lessons),
        },
        "lessons": [lesson.model_dump(mode="json") for lesson in result.lessons],
    }

    formatted_json = json.dumps(output_data, ensure_ascii=False, indent=2)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(formatted_json, encoding="utf-8")
        print(f"Schedule JSON written to {args.output}")
    else:
        print(formatted_json)

    print("\nSummary:")
    print(f"- Total cells processed: {result.total_cells_processed}")
    print(f"- Regex parsed: {result.regex_parsed_count}")
    print(f"- LLM parsed: {result.llm_parsed_count}")
    print(f"- Unresolved cells: {result.unresolved_count}")
    print(f"- Structured lessons: {len(result.lessons)}")


if __name__ == "__main__":
    asyncio.run(run_cli())
