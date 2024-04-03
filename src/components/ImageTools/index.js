import React, { useEffect, useRef, useState } from 'react';
import { message, Button, Tabs, Col, Row, Input, Upload, Divider, Empty, Spin } from 'antd';
import { LoadingOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import JSZip from 'jszip';
import moment from 'moment';
import { saveAs } from 'file-saver';
import PreviewImage from "./PreviewImage"
import Test from "./default.png"

import './index.scss';
const { TextArea } = Input;


const ImageTools = () => {
    const urlRegex = /^https?:\/\//;
    const [value, setValue] = useState(''); //文本域输入框的值
    const [qrcodeList, setQrcodeList] = useState([]); //二维码数据列表
    const [canvasImgUrl, setCanvasImgUrl] = useState([]);//生成的二维码图片数据
    const [loading, setLoading] = useState(false);
    const [imageUrl, setImageUrl] = useState(""); //上传组件的数据源
    const [isValidInput, setIsValidInput] = useState(true); //检查是否合法输入
    const [firstValue,setFirstValue] = useState('')
    const [previewnotice, setPreviewnotice] = useState(""); //上传组件的数据源
    const totalNum = useRef(0)
    const defaultImg = useRef()
    const canvasDom = useRef( document.createElement('canvas'))
    //检查文本域的值是否符合要求，符合要求的则可以进行背景图的上传
    useEffect(() => {
        if (value) {
            const isValid = isAllValidUrls(value);
            setIsValidInput(!isValid)
            setCanvasImgUrl([])
            //如果不存在默认图的情况下，首次调用一下加载默认二维码
            if(!previewnotice && isValid){
                defautlFirstPreview()
            }
        }else{
            //文本域是空的时候则进行清除数据
           setPreviewnotice("")
           setFirstValue('')
           setIsValidInput(true)
        }
    }, [value])

    //初始化设置默认值并传递给预览组件
    useEffect(()=>{
        const defaultPng = Test
        setImageUrl(defaultPng)
        defaultImg.current = defaultPng
        
    },[])

    useEffect(() => {
        if (qrcodeList.length > 0) {
            (async () => {
                try {
                    const processBatch = async (batch) => {
                        const promises = batch.map(async (item) => {
                            const result = await generateCode(item);
                            return result;
                        });
                        const results = await Promise.all(promises);
                        totalNum.current = totalNum.current + results.length;
                        setCanvasImgUrl((prevImages) => [...prevImages, ...results]);
                    };
                    const batchSize = 10; // 根据需要调整批处理大小
                    const batches = [];
                    
                    // 将 qrcodeList 拆分为批次
                    for (let i = 0; i < qrcodeList.length; i += batchSize) {
                        batches.push(qrcodeList.slice(i, i + batchSize));
                    }
                    
                    const processBatches = async () => {
                        for (const batch of batches) {
                            await processBatch(batch);
                        }
                    };
                    
                    if (qrcodeList.length > 0) {
                        processBatches();
                    }
                    
                } catch (error) {

                }

            })()
        }
    }, [qrcodeList]);


// 数据分片梳理完成后下载数据
    useEffect(() => {
        if (canvasImgUrl.length > 0 && canvasImgUrl.length === qrcodeList.length) {
            let downAll = async () => {
                await handleDownloadImages(canvasImgUrl);
                resetAll();

            }
            downAll()
        }
    }, [canvasImgUrl])

    const resetAll = () => {
        console.log("我被调用")
        setQrcodeList([])
        setCanvasImgUrl([])
        setImageUrl((defaultImg.current || ''))
        setLoading(false)
        // setIsValidInput(true)
        totalNum.current = 0
    }

    //统一获取文本域的值
    const getTextAreaArrary = async() =>{
        const textAreaList = (value || '').split('\n').map(s => s.trim()).filter(Boolean);
        console.log(textAreaList,'textAreaList')
        return textAreaList
    }

    const defautlFirstPreview = async() =>{
        let textAreaList = await getTextAreaArrary()
        setFirstValue(textAreaList[0])
    }


    const checkFile = (file) => {
        // 检查文件类型
        const isTxt = file.type === 'text/plain';
        if (!isTxt) {
            message.error('只能上传文本文件（.txt）!');
            return Upload.LIST_IGNORE;
        }

        // 检查文件大小
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('文件大小不能超过 2MB!');
        }
        return isTxt && isLt2M
    };

    // 将文件以 Base64 编码形式发送到服务器。模拟上传到服务器
    const customRequest = ({ file, onSuccess, onError }) => {
        // 将文件以 Base64 编码形式发送到服务器
        const reader = new FileReader();
        reader.onload = (e) => {
            console.log(reader,'reader')
            if (reader && reader.result) {
                const result = (reader.result || '' ).trim()
                const isValid = isAllValidUrls(result);
                if (isValid) {
                    message.success('上传成功,解析完成')
                    setIsValidInput(false)
                    setValue(result);
                    onSuccess();
                } else {
                    message.error('解析失败,内容不符合规则,请重新上传！')
                    setIsValidInput(true)
                }
            }
        };
        reader.onerror = () => {
            onError(new Error('File reading failed'));
        };
        reader.readAsText(file);
    };

    // 将文件以 Base64 编码形式发送到服务器。模拟上传到服务器
    const customRequestImage = ({ file, onSuccess, onError }) => {
        // 将文件以 Base64 编码形式发送到服务器
        const reader = new FileReader();
        reader.onload = (e) => {
            onSuccess();
        };
        reader.onerror = () => {
            onError(new Error('File reading failed'));
        };
        reader.readAsDataURL(file);
    };

    //输入完成后检查内容是否符合网站规则
    const isAllValidUrls = (urls) => {
        let textAreaList = (urls || '').split('\n').map(s => s.trim()).filter(Boolean);
        return textAreaList.every(url => urlRegex.test(url));
    };

    // 上传前的检查
    const beforeUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('只能上传图片文件！');
            
        }

          // 检查文件大小
          const isLt1M = file.size / 1024 / 1024 < 2;
          if (!isLt1M) {
              message.error('文件大小不能超过 2MB!');
              return Upload.LIST_IGNORE;
          }
        
          if(isImage && isLt1M){
            resetAll()
          }
        return isImage && isLt1M
    };

    const getBase64 = (img, callback) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => callback(reader.result));
        reader.readAsDataURL(img);
    };

    // 文件上传状态变化时的处理
    const onChange = (info) => {
        //因为是本地上传所以不涉及到服务器交互所以只需要判断是error的时候开始判断即可
        if (info.file.status === 'done') {
            getBase64(info.file.originFileObj, async (url) => {
                try {
                    let isCode = await isUploadCode(url)
                    if (isCode) {
                        setImageUrl(url);
                        //查询第一个数据，将他传递给预览组件
                        let textAreaList = await getTextAreaArrary()
                        setFirstValue(textAreaList[0])
                    }
                } catch (error) {
                    message.error('请上传带二维码的图片!')
                    resetAll()
                }
            });
        }
    };

    const onChangeTab = () => {
        resetAll()
        setValue('')
        setIsValidInput(true)
    };

    //批量下载
    const downAll = async () => {
        console.log("开始下载-----------------", new Date())
        setLoading(true)
        let isDiff = await differenceTextAreaValue()
        //比较是否动过了数据，如果不一样则重新处理整个数据（PS：后续可以增加只处理差异部分，拼接正常部分，减少内存消耗）
        if (isDiff) {
            setCanvasImgUrl([])
        }
        setTimeout(async () => {
            let qrData = await generateCodeAll()
            setQrcodeList(qrData)
        }, 1000)
    }

    //对比下差异，防止上传图片后继续添加网址，导致数据缺失问题
    const differenceTextAreaValue = async() => {
        const textAreaList = await getTextAreaArrary()
        return textAreaList.length === qrcodeList.length;
      };

    //批量生成二维码，处理好数据返回到list当中
    const generateCodeAll = async () => {
        totalNum.current = 0;
        const textAreaList = await getTextAreaArrary()
        const qrcodeData = textAreaList.map(async (item) => {
            let codeItemData = await QRCode.toDataURL(item, {
                margin: 0,
                scale: 3,
                // color:{   //修改二维码的颜色
                //     dark:"#ff0000"
                // }
            })
            return codeItemData
        })
        const resultData = await Promise.all(qrcodeData)
        return resultData
    }

    //检查上传图片中是否包含二维码
    const isUploadCode = (imageUrl) => {
        return new Promise((resolve, reject) => {
            let canvasElement = document.createElement('canvas');
            let ctx = canvasElement.getContext("2d");
            const img = new Image();
            img.src = imageUrl;
            img.onload = function () {
                canvasElement.width = img.width;
                canvasElement.height = img.height;
                if (ctx) {
                    ctx.drawImage(img, 0, 0, img.width, img.height);
                    // 使用jsQR检测二维码的位置
                    const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
                    const { data } = imageData;
                    const code = jsQR(data, canvasElement.width, canvasElement.height);
                    if (code) {
                        resolve(code)
                    } else {
                        reject(false)
                    }
                }
            }
        })
    }

    //处理上传图片，接受一个参数，生成最终二维码
    const generateCode = async (qrcodeUrl) => {
        let canvas = canvasDom.current
        const ctx = canvas.getContext("2d");
        // 用于存储覆盖图片的元素
        const overlayImage = new Image();
        overlayImage.src = qrcodeUrl; // 替换为你的覆盖图片路径
        // 在画布上绘制图像
        const img = new Image();
        img.src = imageUrl;
        console.log(imageUrl,'imageUrl')
        return new Promise((resolve, reject) => {
            overlayImage.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                if(ctx){
                    ctx.drawImage(img, 0, 0, img.width, img.height);
                    // 使用jsQR检测二维码的位置
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const { data } = imageData;
                    const code = jsQR(data, canvas.width, canvas.height);
                    if (code) {
                        const ints = code.location;
                        // 覆盖图片的位置
                        const overlayX = ints.topLeftCorner.x;
                        const overlayY = ints.topLeftCorner.y;
                        // 在二维码位置上覆盖另一张图片
                        ctx.drawImage(overlayImage, overlayX, overlayY, ints.topRightCorner.x - overlayX + 2, ints.bottomLeftCorner.y - overlayY + 2);
                        //开启质量压缩 暂时先注释
                        // const ctxData =  canvas.toDataURL(img.type|| 'image/jpeg',0.95);
                        const ctxData =  canvas.toDataURL();
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        resolve(ctxData)
                }
                }
            };
        })
    };

    //打包下载图片
    const handleDownloadImages = async (results) => {
        // 创建一个新的JSZip实例
        const zip = new JSZip();
        // 遍历图片Data URL数组
        results.forEach((dataURL, index) => {
            // 将Data URL转换为Blob
            const blob = dataURItoBlob(dataURL);
            // 添加到ZIP文件中
            zip.file(`img${index + 1}.jpg`, blob);
        });

        // 生成ZIP文件内容
        const content = await zip.generateAsync({ type: "blob" });

        // 使用FileSaver保存ZIP文件
        saveAs(content, `批量生成二维码_${moment().format("YYYY-MM-DD HH:ss")}.zip`);

        // 可以设置一个状态来显示下载完成或隐藏下载按钮等
        setLoading(false)
        console.log('数据执行完成了~~~~~~~~~~~~',new Date())
    };
    
    // Data URL转Blob的辅助函数
    function dataURItoBlob(dataURI) {
        // 分离MIME类型和Base64编码的数据
        const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
        const byteString = atob(dataURI.split(',')[1]);

        // 创建Uint8Array视图
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
            uint8Array[i] = byteString.charCodeAt(i);
        }
        return new Blob([uint8Array], { type: mimeString });
    }

    //预览组件的回调，通知下载按钮可以使用了
    const changePreviewnotice = (result) => {
        setPreviewnotice(result)
    }

    const uploadButton = (
        <button
            style={{
                border: 0,
                background: 'none',
            }}
            type="button"
        >
            {loading ? <LoadingOutlined /> : <PlusOutlined />}
            <div
                style={{
                    marginTop: 8,
                }}
            >
                上传
            </div>
        </button>
    );

    const textAreaTemplate = () => {
        return (
            <div style={{
                height: "100%",
                overflow: "auto"
            }}>
                <TextArea
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="请用回车键分隔链接，否则无法正常解析！"
                    autoSize={{ minRows: 6, maxRows: 10 }}
                    allowClear
                    autoComplete="off" 
                    spellCheck="false"
                    style={{
                        overflow: "auto"
                    }}
                />
                <span className="text-tips">请用回车键分隔链接，否则无法正常解析！</span>
            </div>
        );
    };


    const uploadTemplate = () => {
        return (
            <div className='image-tab-upload-box'>
                <Upload
                    // @ts-ignore
                    customRequest={customRequest}
                    listType="text"
                    accept='text/plain'
                    maxCount={1}
                    className="image-uploader"
                    beforeUpload={checkFile}
                >
                    <Button icon={<UploadOutlined />}>上传文本文件</Button>
                </Upload>
            </div>
        );

    };

    const items = [
        {
            key: '1',
            label: '手动填写',
            children: textAreaTemplate(),
        },
        {
            key: '2',
            label: '一键上传',
            children: uploadTemplate(),
        },
    ];

    return (
        <Spin spinning={loading} style={{ width: "100%" }} tip="正在下载请稍候...">
            <div className="image-box">
                <h1 className='image-title'>批量生成二维码下载工具  <a className="text-tips" target='_bank' href='https://alidocs.dingtalk.com/i/nodes/R1zknDm0WR3ePldXHK7x7kaqVBQEx5rG?utm_scene=person_space'>使用指南</a></h1>
                <div className='image-content'>

                    <Row>
                        <Col span={12}>
                            1.选择数据方式 <span className="text-tips">(切换tab会清空所有数据)</span>
                            <Tabs defaultActiveKey="1" items={items} onChange={onChangeTab} className="image-tab" destroyInactiveTabPane={true} />
                        </Col>
                        <Col span={10} offset={2}>
                            <p>
                                2.点击下方二维码上传背景图 <span className="text-tips">(需要图片携带二维码)</span>
                            </p>
                            <Upload
                                name="image"
                                beforeUpload={beforeUpload}
                                onChange={onChange}
                                accept="image/*"
                                listType="picture-card"
                                showUploadList={false}
                                className="image-uploader"
                                disabled={isValidInput}
                                //@ts-ignore
                                customRequest={customRequestImage}
                            >
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt="avatar"
                                        style={{
                                            width: '100%',
                                        }}
                                    />
                                ) : (
                                    uploadButton
                                )}
                            </Upload>
                        </Col>
                        <Divider style={{ width: "100%" }} />
                         <Col span={12}>
                            <p>3.效果展示<span className="text-tips"> (点击图片可以查看大图)</span></p>
                            {imageUrl && !isValidInput ? <PreviewImage qrcodeUrl={firstValue} imageUrl={imageUrl} onChangePreviewnotice={changePreviewnotice} />
                                : <Empty description="请填写数据" />}
                        </Col>
                    </Row>
                    <div className='image-btn'>
                        <Button type="primary" disabled={previewnotice.length>0 ? false : true} onClick={downAll}>下载压缩包</Button>
                    </div>
                </div>

            </div>
        </Spin>
    );
};
export default ImageTools;
