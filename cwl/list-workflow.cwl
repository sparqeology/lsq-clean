#!/usr/bin/env cwl-runner
cwlVersion: v1.2
class: Workflow

requirements:
    ScatterFeatureRequirement: {}
    SubworkflowFeatureRequirement: {}
    StepInputExpressionRequirement: {}
    InlineJavascriptRequirement: {}
    MultipleInputFeatureRequirement: {}
    SchemaDefRequirement:
        types:
            - $import: lsq-source-type.yml

inputs:
    lsq_sources: lsq-source-type.yml#lsq_source[]
    base_sources_uri:
        type: string
        default: http://lsq.aksw.org/sources/
    rdf_output: boolean
    csv_output: boolean

steps:
    clean_single_source:
        in:
            lsq_source_with_id: lsq_sources
            base_sources_uri: base_sources_uri
            rdf_output: rdf_output
            csv_output: csv_output
        scatter: lsq_source_with_id
        run: 
            class: Workflow
            inputs:
                lsq_source_with_id: lsq-source-type.yml#lsq_source
                base_sources_uri: string
                rdf_output: boolean
                csv_output: boolean
            steps:
                clean_file:
                    run: simple-workflow.cwl
                    in:
                        lsq_source:
                            source: lsq_source_with_id
                            valueFrom: $(self.source_file)
                        execs_ns:
                            source: [base_sources_uri, lsq_source_with_id]
                            # valueFrom: $(`${self.base_sources_uri}${self.lsq_source_with_id.source_id}/execs/`)
                            valueFrom: $(`${self[0]}${self[1].source_id}/execs/`)
                        queries_csv_filename:
                            source: [csv_output, lsq_source_with_id]
                            valueFrom: |
                                $(self[0] ? (self[1].source_id + '_queries') : null)
                        execs_csv_filename:
                            source: [csv_output, lsq_source_with_id]
                            valueFrom: |
                                $(self[0] ? (self[1].source_id + '_execs') : null)
                        queries_rdf_filename:
                            source: [rdf_output, lsq_source_with_id]
                            valueFrom: |
                                $(self[0] ? (self[1].source_id + '_queries') : null)
                        execs_rdf_filename:
                            source: [rdf_output, lsq_source_with_id]
                            valueFrom: |
                                $(self[0] ? (self[1].source_id + '_execs') : null)
                    out: [queries_csv, execs_csv, queries_rdf, execs_rdf]
            outputs:
                queries_csv:
                    type: File
                    outputSource: clean_file/queries_csv
                execs_csv:
                    type: File
                    outputSource: clean_file/execs_csv
                queries_rdf:
                    type: File
                    outputSource: clean_file/queries_rdf
                execs_rdf:
                    type: File
                    outputSource: clean_file/execs_rdf
        out: [queries_csv, execs_csv, queries_rdf, execs_rdf]

outputs:
    queries_csv:
        type: File[]
        outputSource: clean_single_source/queries_csv
    execs_csv:
        type: File[]
        outputSource: clean_single_source/execs_csv
    queries_rdf:
        type: File[]
        outputSource: clean_single_source/queries_rdf
    execs_rdf:
        type: File[]
        outputSource: clean_single_source/execs_rdf
