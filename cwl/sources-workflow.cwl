#!/usr/bin/env cwl-runner
cwlVersion: v1.2
class: Workflow

requirements:
    ScatterFeatureRequirement: {}
    SubworkflowFeatureRequirement: {}
    StepInputExpressionRequirement: {}
    InlineJavascriptRequirement: {}

    SchemaDefRequirement:
        types:
            - name: lsq_relative_source
              type: record
              fields:
                  source_id: string
                  source_path: string
            - $import: lsq-source-type.yml
inputs:
    sources: lsq_relative_source[]
    base_url: string
    extension: string
    base_sources_uri:
        type: string
        default: http://lsq.aksw.org/sources/
    rdf_output: boolean
    csv_output: boolean

steps:
    prepare_files:
        in:
            relative_source: sources
            base_url: base_url
            extension: extension
        scatter: relative_source
        run: 
            class: ExpressionTool
            inputs:
                relative_source: lsq_relative_source
                base_url: string
                extension: string
            expression: |
                $( {
                    lsq_source: {
                        source_id: inputs.relative_source.source_id,
                        source_file: {
                            class: 'File',
                            location: inputs.base_url + inputs.relative_source.source_path + inputs.extension
                        }
                    }
                })
            outputs:
                lsq_source: lsq-source-type.yml#lsq_source
        out: [lsq_source]
    clean_sources:
        in:
            lsq_sources: prepare_files/lsq_source
            base_sources_uri: base_sources_uri
            rdf_output: rdf_output
            csv_output: csv_output
        run: filelist-workflow.cwl
        out: [queries_csv, execs_csv, queries_rdf, execs_rdf]

outputs:
    queries_csv:
        type: File[]
        outputSource: clean_sources/queries_csv
    execs_csv:
        type: File[]
        outputSource: clean_sources/execs_csv
    queries_rdf:
        type: File[]
        outputSource: clean_sources/queries_rdf
    execs_rdf:
        type: File[]
        outputSource: clean_sources/execs_rdf
    # lsq_sources:
    #     type: lsq-source-type.yml#lsq_source[]
    #     outputSource: prepare_files/lsq_source
