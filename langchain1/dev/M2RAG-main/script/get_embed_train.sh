# The script is used to encode the query and multi-modal candidates.

MODEL_NAME='../pretrained_model/bge-base-en-v1.5' # or BAAI/bge-base-en-v1.5
MODEL_WEIGHT='../pretrained_model/Visualized_base_en_v1.5.pth'

# ---------Task-1: image_cap----------
# train_query
export CUDA_VISIBLE_DEVICES=0
python ../src/get_emb.py \
--model_name $MODEL_NAME \
--model_weight $MODEL_WEIGHT \
--out_path ../output/embed/ \
--image_path ../data/m2rag/image_cap/train_data.jsonl \
--dataset_name webqa \
--task image_cap \
--encode_image \
--is_query


# ---------Task-2: mmqa----------
# train_query
export CUDA_VISIBLE_DEVICES=1
python ../src/get_emb.py \
--model_name $MODEL_NAME \
--model_weight $MODEL_WEIGHT \
--out_path ../output/embed/ \
--image_path ../data/m2rag/mmqa/train_data.jsonl \
--dataset_name webqa \
--task mmqa \
--encode_text \
--is_query


# ---------Task-3: fact_verify----------
# train_query
export CUDA_VISIBLE_DEVICES=2
python ../src/get_emb.py \
--model_name $MODEL_NAME \
--model_weight $MODEL_WEIGHT \
--out_path ../output/embed/ \
--image_path ../data/m2rag/fact_verify/val_data.jsonl \
--dataset_name factify \
--task fact_verify \
--encode_image \
--is_query
